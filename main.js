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
loader.load("./data/02_ground_downsample.ply", function (plyGeometry) {

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
            intensityThreshold: { value: 0.389 },
        },
        vertexShader:
            `
                float rgbToIntensity(vec3 color) {
                    float r = color.r;
                    float g = color.g;
                    float b = color.b;
    
                    if (b > g && b > r) {
                        return mix(0.0, 0.333, (g - b) / 255.0 + 1.0);
                    } else if (g > r) {
                        return mix(0.333, 0.666, r / 255.0);
                    } else {
                        return mix(0.666, 1.0, 1.0 - g / 255.0);
                    }
                }
                uniform float intensityThreshold;
                varying vec3 vColor;
                varying float capacity;
                
                void main() {
                    vColor = color;
                    float intensity = rgbToIntensity(color.rgb);
                    capacity = intensity;
    
                    if (intensity < intensityThreshold) {
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
                varying float capacity;
                
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `,
        vertexColors: true,
    });

    // Slider functionality
    const opacitySlider = document.getElementById('opacity-slider');

    opacitySlider.addEventListener('input', function () {
        const opacityValue = parseFloat(opacitySlider.value) / 1000;
        material.uniforms.intensityThreshold.value = opacityValue;
        material.needsUpdate = true; // Ensure the material updates
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