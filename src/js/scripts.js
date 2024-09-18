import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const params = {
    red: 1.0,
    green: 1.0,
    blue: 1.0,
    threshold: 0.5,
    strength: 0.5,
    radius: 0.8,
    volume: 1.0,
    playbackRate: 1.0,
    zoom: 14
};

renderer.outputColorSpace = THREE.SRGBColorSpace;

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);
const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

camera.position.set(0, -2, params.zoom);
camera.lookAt(0, 0, 0);

const uniforms = {
    u_time: { type: 'f', value: 0.0 },
    u_frequency: { type: 'f', value: 0.0 },
    u_red: { type: 'f', value: 1.0 },
    u_green: { type: 'f', value: 1.0 },
    u_blue: { type: 'f', value: 1.0 }
};

const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent
});

const geo = new THREE.IcosahedronGeometry(4, 30);
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
mesh.material.wireframe = true;

// Tạo hình cầu bao quanh hình khối
const sphereGeometry = new THREE.SphereGeometry(10, 32, 32);
const sphereMaterial = new THREE.MeshNormalMaterial({ color: 0x00ff00, wireframe: true });
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);

const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/001.mp3', function (buffer) {
    sound.setBuffer(buffer);
    sound.setVolume(params.volume);
    sound.setPlaybackRate(params.playbackRate);

    window.addEventListener('click', function () {
        sound.play();
    });
});

const analyser = new THREE.AudioAnalyser(sound, 32);

// Tạo hạt âm thanh
const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const particles = [];

function createParticles(count) {
    for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );
        scene.add(particle);
        particles.push(particle);
    }
}

// Tạo hạt ban đầu
createParticles(50);

const gui = new GUI();

const colorsFolder = gui.addFolder('Colors');
colorsFolder.add(params, 'red', 0, 1).onChange(function (value) {
    uniforms.u_red.value = Number(value);
});
colorsFolder.add(params, 'green', 0, 1).onChange(function (value) {
    uniforms.u_green.value = Number(value);
});
colorsFolder.add(params, 'blue', 0, 1).onChange(function (value) {
    uniforms.u_blue.value = Number(value);
});

const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(function (value) {
    bloomPass.threshold = Number(value);
});
bloomFolder.add(params, 'strength', 0, 3).onChange(function (value) {
    bloomPass.strength = Number(value);
});
bloomFolder.add(params, 'radius', 0, 1).onChange(function (value) {
    bloomPass.radius = Number(value);
});

// Thêm GUI cho âm lượng và tốc độ phát
const audioFolder = gui.addFolder('Audio Controls');
audioFolder.add(params, 'volume', 0, 1).onChange(function (value) {
    sound.setVolume(Number(value));
});
audioFolder.add(params, 'playbackRate', 0.5, 2).onChange(function (value) {
    sound.setPlaybackRate(Number(value));
});

// Thêm GUI cho khoảng cách camera
const zoomFolder = gui.addFolder('Camera Controls');
zoomFolder.add(params, 'zoom', 5, 30).onChange(function (value) {
    camera.position.z = value;
});

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function (e) {
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    mouseX = (e.clientX - windowHalfX) / 100;
    mouseY = (e.clientY - windowHalfY) / 100;
});

// Thêm sự kiện cuộn chuột để thu phóng
window.addEventListener('wheel', function (e) {
    params.zoom += e.deltaY * 0.01; // Điều chỉnh tốc độ thu phóng
    params.zoom = Math.max(5, Math.min(30, params.zoom)); // Giới hạn khoảng cách
    camera.position.z = params.zoom;
});

const clock = new THREE.Clock();
function animate() {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.5;
    camera.lookAt(scene.position);
    
    // Cập nhật âm thanh và hạt
    const averageFrequency = analyser.getAverageFrequency();
    const particleCount = Math.floor(averageFrequency / 10); // Thay đổi số lượng hạt dựa trên âm lượng
    const particleSize = Math.min(1, averageFrequency / 100); // Thay đổi kích thước hạt

    // Tạo hạt mới nếu cần
    if (particles.length < particleCount) {
        createParticles(particleCount - particles.length);
    }

    // Cập nhật kích thước hạt
    particles.forEach(particle => {
        particle.scale.set(particleSize, particleSize, particleSize);
    });

    uniforms.u_time.value = clock.getElapsedTime();
    uniforms.u_frequency.value = averageFrequency;
    bloomComposer.render();
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
});
