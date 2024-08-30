const sliderTrack = document.querySelector('.slider-track');
const lowerHandle = document.getElementById('lowerHandle');
const upperHandle = document.getElementById('upperHandle');
const lowerBoundValue = document.getElementById('lowerBoundValue');
const upperBoundValue = document.getElementById('upperBoundValue');
const lowerOverlay = document.getElementById('lowerOverlay');
const upperOverlay = document.getElementById('upperOverlay');

let isDragging = null;

function setHandlePosition(handle, value) {
    handle.style.left = `${value}%`;
}

function updateOverlays() {
    const lowerValue = parseInt(lowerHandle.style.left);
    const upperValue = parseInt(upperHandle.style.left);
    lowerOverlay.style.width = `${lowerValue}%`;
    upperOverlay.style.left = `${upperValue}%`;
    upperOverlay.style.width = `${100 - upperValue}%`;
}

function updateValues() {
    const lowerValue = parseInt(lowerHandle.style.left);
    const upperValue = parseInt(upperHandle.style.left);
    lowerBoundValue.textContent = lowerValue;
    upperBoundValue.textContent = upperValue;
    updateOverlays();
}

function handleMouseDown(e) {
    isDragging = e.target;
}

function handleMouseUp() {
    isDragging = null;
}

function handleMouseMove(e) {
    if (!isDragging) return;

    const rect = sliderTrack.getBoundingClientRect();
    let value = ((e.clientX - rect.left) / rect.width) * 100;
    value = Math.min(Math.max(value, 0), 100);

    if (isDragging === lowerHandle) {
        const upperValue = parseInt(upperHandle.style.left);
        if (value < upperValue) {
            setHandlePosition(lowerHandle, value);
        }
    } else if (isDragging === upperHandle) {
        const lowerValue = parseInt(lowerHandle.style.left);
        if (value > lowerValue) {
            setHandlePosition(upperHandle, value);
        }
    }

    updateValues();
}

setHandlePosition(lowerHandle, 0);
setHandlePosition(upperHandle, 100);
updateValues();

lowerHandle.addEventListener('mousedown', handleMouseDown);
upperHandle.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mouseup', handleMouseUp);


// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(
    camera,
    renderer.domElement
);
controls.enableDamping = true; // Smooth orbiting
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;

// Load the PLY file
const loader = new THREE.PLYLoader();
loader.load("./data/01_column.ply", function (plyGeometry) {

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(plyGeometry.attributes.position.array, 3)
    );
    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(plyGeometry.attributes.color.array, 3)
    );
    geometry.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            L: { value: 0 },
            R: { value: 100 },
        },
        vertexShader:
            `
                vec3 interpolateColor(float ratio, vec3 color1, vec3 color2) {
                    return mix(color1, color2, ratio);
                }

                vec3 intensityToRGB(float intensity) {
                    if (intensity <= 0.333) {
                        return interpolateColor(intensity / 0.333, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0)); // Blue -> Green
                    } else if (intensity <= 0.666) {
                        return interpolateColor((intensity - 0.333) / 0.333, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0)); // Green -> Yellow
                    } else {
                        return interpolateColor((intensity - 0.666) / 0.334, vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0)); // Yellow -> Red
                    }
                }

                uniform float L;
                uniform float R;
                varying vec3 vColor;
                
                void main() {
                    float intensity = color[0];
                    vColor = intensityToRGB(intensity);
    
                    if (intensity < L - 1e-6 || intensity > R + 1e-6) {
                        gl_Position = vec4(0.0, 0.0, 1e10, 1.0);
                    } else {
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                    
                    gl_PointSize = 10.0;
                }
            `,
        fragmentShader:
            `
                varying vec3 vColor;
                
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `,
        vertexColors: true,
    });

    document.addEventListener('mousemove', (e) => {
        handleMouseMove(e);
        const lowerValue = parseInt(lowerHandle.style.left);
        const upperValue = parseInt(upperHandle.style.left);
        material.uniforms.L.value = lowerValue / 100;
        material.uniforms.R.value = upperValue / 100;
    });

    geometry.computeVertexNormals();

    // Create and add the point cloud to the scene
    const pointCloud = new THREE.Points(
        geometry,
        material
    );
    scene.add(pointCloud);

    // Compute the bounding box of the point cloud
    const boundingBox = new THREE.Box3().setFromObject(pointCloud);
    boundingBox.getCenter(camera.position);

    // Adjust the camera position
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    camera.position.set(
        camera.position.x,
        camera.position.y,
        cameraZ * 1.5
    );

    // Make the camera look at the center of the point cloud
    camera.lookAt(boundingBox.getCenter(new THREE.Vector3()));

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

});

// Handle window resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});