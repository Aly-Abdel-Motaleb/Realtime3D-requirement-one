import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from 'https://unpkg.com/lil-gui@0.16.1/dist/lil-gui.esm.js';

// Shared state for XR teleoperation and baseline capture
const teleopState = {};


export function initializeScene(canvasId, enableShadows = false, enableGui = true) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true,
        alpha: true  // Enable transparency for AR mode
    });

    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    
    // baseline mapping: captured per-teleopState inside createDirectHandTeleop and
    // reset via teleopState.resetBaseline() when an XR session starts.

    let gui = null;
    if (enableGui) {
        gui = new GUI({ width: 300, title: "Controls" });
        let guiVisible = true;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'h') {
                guiVisible = !guiVisible;
                if (guiVisible) gui.show(); else gui.hide();
            }
        });
    }

    const fov = 70;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, near, far);
    camera.updateProjectionMatrix();
    camera.position.set(5, 2.5, 5);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0.5, 0.5);

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    window.addEventListener('resize', () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    const scene = new THREE.Scene();

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    // Enable shadows if requested
    if (enableShadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Enable WebXR
    renderer.xr.enabled = true;

    return { renderer, scene, camera, controls, gui };
}

export function createLights(scene , enableShadows = false) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF,2,3,1);
    pointLight.position.set(-1.8, 0, 4.5);
    scene.add(pointLight);


    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(2.8, 1.7, 0.5);
    scene.add(directionalLight);

    if (enableShadows) {
        // Directional light (primary shadow caster)
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(4096, 4096); // higher resolution
        directionalLight.shadow.camera.left = -3;
        directionalLight.shadow.camera.right = 3;
        directionalLight.shadow.camera.top = 3;
        directionalLight.shadow.camera.bottom = -3;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.bias = -0.0005;
        directionalLight.shadow.normalBias = 0.02; // reduce acne without large bias
        directionalLight.shadow.radius = 8; // soften edges

        // Point light (optional, lower-res cube map)
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.set(1024, 1024);
        pointLight.shadow.bias = -0.0005;
        pointLight.shadow.normalBias = 0.02;
        pointLight.shadow.radius = 6;
    }

    return { ambientLight, pointLight, directionalLight };
}







export function loadTextures() {
    const textureLoader = new THREE.TextureLoader();

    return {
        floor: {
            color: textureLoader.load('./Resources/Textures/Floor/floor_Color.jpg'),
            normal: textureLoader.load('./Resources/Textures/Floor/floor_Normal.jpg'),
            roughness: textureLoader.load('./Resources/Textures/Floor/floor_Roughness.jpg'),
            displacement: textureLoader.load('./Resources/Textures/Floor/floor_Displacement.jpg')
        },
        wall: {
            color: textureLoader.load('./Resources/Textures/Wall/wall_Color.jpg'),
            normal: textureLoader.load('./Resources/Textures/Wall/wall_Normal.jpg'),
            roughness: textureLoader.load('./Resources/Textures/Wall/wall_Roughness.jpg'),
            displacement: textureLoader.load('./Resources/Textures/Wall/wall_Displacement.jpg'),
            ao: textureLoader.load('./Resources/Textures/Wall/wall_AO.jpg')
        },
        counter: {
            color: textureLoader.load('./Resources/Textures/Counter/counter_Color.jpg'),
            normal: textureLoader.load('./Resources/Textures/Counter/counter_NormalGL.jpg'),
            roughness: textureLoader.load('./Resources/Textures/Counter/counter_Roughness.jpg'),
            displacement: textureLoader.load('./Resources/Textures/Counter/counter_Displacement.jpg')
        },
        plate: {
            color: textureLoader.load('./Resources/Textures/Plate/plate_Color.jpg'),
            normal: textureLoader.load('./Resources/Textures/Plate/plate_Normal.jpg'),
            roughness: textureLoader.load('./Resources/Textures/Plate/plate_Roughness.jpg'),
            displacement: textureLoader.load('./Resources/Textures/Plate/plate_Displacement.jpg')
        },
        robot: {
            color: textureLoader.load('./Resources/Textures/Robot/robot_Color.jpg'),
            normal: textureLoader.load('./Resources/Textures/Robot/robot_Normal.jpg'),
            roughness: textureLoader.load('./Resources/Textures/Robot/robot_Roughness.jpg'),
            displacement: textureLoader.load('./Resources/Textures/Robot/robot_Displacement.jpg'),
            metalness: textureLoader.load('./Resources/Textures/Robot/robot_Metalness.jpg')
        }
    };
}

export function createEnvironment(scene, textures , enableShadows = false, arMode = false) {
    scene.background = new THREE.Color(0xAAAAAA); 
    // Floor - transparent in AR mode
    const floorGeometry = new THREE.PlaneGeometry(5, 5);
    const floorMaterial = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        map: textures.floor.color,
        normalMap: textures.floor.normal,
        roughnessMap: textures.floor.roughness,
        displacementMap: textures.floor.displacement,
        displacementScale: 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    
    if (enableShadows) {
        floor.receiveShadow = true;
    }
    
    scene.add(floor);

    // Walls
    const wallGeometry = new THREE.PlaneGeometry(4, 5);
    const wallMaterial = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        map: textures.wall.color,
        normalMap: textures.wall.normal,
        roughnessMap: textures.wall.roughness,
        displacementMap: textures.wall.displacement,
        displacementScale: 0.5
    });

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());

    backWall.position.set(-2.69, 0, 2.19);
    backWall.rotation.y = Math.PI * 0.5;
    leftWall.position.set(0, 2.7, 2.19);
    leftWall.rotation.x = Math.PI * 0.5;
    leftWall.rotation.z = Math.PI * 0.5;

    if (enableShadows) {
        backWall.receiveShadow = true;
        leftWall.receiveShadow = true;
    }

    scene.add(backWall);
    scene.add(leftWall);

    // Counter
    const counterGeometry = new THREE.BoxGeometry(5, 0.15, 1);
    const counterMaterial = new THREE.MeshPhysicalMaterial({
        map: textures.counter.color,
        normalMap: textures.counter.normal,
        roughnessMap: textures.counter.roughness,
        roughness: 0.01,
        sheen: 1,
        sheenRoughness: 0.5,
        sheenColor: 0xffffff
    });
    const counter = new THREE.Mesh(counterGeometry, counterMaterial);
    counter.position.z = 1.6;
    counter.position.x = -1.95;
    counter.rotation.x = Math.PI * 0.5;
    counter.rotation.y = Math.PI * 0.5;
    
    if (enableShadows) {
        counter.receiveShadow = true;
    }
    
    scene.add(counter);

    // Glass
    const glassGeometry = new THREE.CylinderGeometry(0.2, 0.17, 0.6, 32, 1, true);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.02,
        transmission: 0.85,
        thickness: 0.4,
        ior: 1.6,
        side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(-1.8, 1, 2);
    glass.rotation.x = Math.PI * 0.5;
    
    if (enableShadows) {
        glass.receiveShadow = true;
    }
    
    scene.add(glass);

    // Plate
    const plateGeometry = new THREE.CylinderGeometry(0.35, 0.32, 0.05, 32);
    const plateMaterial = new THREE.MeshStandardMaterial({
        map: textures.plate.color,
        normalMap: textures.plate.normal,
        roughnessMap: textures.plate.roughness
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.set(-1.8, 0.25, 1.7);
    plate.rotation.x = Math.PI * 0.5;
    
    if (enableShadows) {
        plate.castShadow = true;
        plate.receiveShadow = true;
    }

    scene.add(plate);

    const environmentObjects = { floor, backWall, leftWall, counter, glass, plate };

    if (arMode) {
        setEnvironmentARMode(environmentObjects, true, scene);
    }

    return environmentObjects;
}

export function setEnvironmentARMode(environmentObjects, enabled, scene = null, renderer = null) {
    if (!environmentObjects) return;

    // Hide walls + floor in AR so the real world shows through.
    // Counter, glass and plate stay solid — robot appears on your real table.
    const hiddenInAR = [
        environmentObjects.backWall,
        environmentObjects.leftWall,
        environmentObjects.floor
    ];

    hiddenInAR.forEach((mesh) => {
        if (!mesh) return;
        // Hide/show the mesh object itself — most reliable, no material state juggling
        mesh.visible = !enabled;
    });

    if (scene) {
        // In AR the scene background MUST be null so Three.js doesn't draw a solid
        // color quad that covers the passthrough camera feed
        if (enabled) {
            if (scene.userData._arOriginalBackground === undefined) {
                scene.userData._arOriginalBackground = scene.background;
            }
            scene.background = null;
        } else {
            scene.background = scene.userData._arOriginalBackground ?? new THREE.Color(0xAAAAAA);
        }
    }

    if (renderer) {
        if (enabled) {
            // alpha-blend passthrough: the WebGL framebuffer must be cleared to (0,0,0,0)
            // each frame so transparent pixels show the camera feed underneath.
            // Setting autoClearColor=false lets us do this manually in the render loop.
            renderer.setClearColor(0x000000, 0);
            renderer.autoClearColor = false;
            // Store a frame-start clear callback so the render loop can call it
            renderer.userData._arClearFn = () => {
                const gl = renderer.getContext();
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            };
        } else {
            renderer.setClearColor(0x000000, 1);
            renderer.autoClearColor = true;
            renderer.userData._arClearFn = null;
        }
    }
}

function createPairedMesh(geometry, material, positions, showAxes = false, axesScale = 0.3) {
    const right = new THREE.Mesh(geometry, material);
    const left = new THREE.Mesh(geometry, material);
    
    right.position.set(positions.right.x, positions.right.y, positions.right.z);
    left.position.set(positions.left.x, positions.left.y, positions.left.z);
    
    if (showAxes) {
        right.add(new THREE.AxesHelper(axesScale));
        left.add(new THREE.AxesHelper(axesScale));
    }
    
    return { right, left };
}

export function createRobot(scene, textures, showAxes = true , enableShadows = false) {
    const robotMaterial = new THREE.MeshStandardMaterial({
        map: textures.robot.color,
        normalMap: textures.robot.normal,
        roughnessMap: textures.robot.roughness,
        displacementMap: textures.robot.displacement,
        metalnessMap: textures.robot.metalness,
        displacementScale: 0,
        metalness: 0.7
    });

    const robot = new THREE.Group();
    const axesSize = 0.3;

    // ROOT NODE: body (torso)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), robotMaterial);
    robot.add(body);
    if (showAxes) body.add(new THREE.AxesHelper(axesSize));

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), robotMaterial);
    head.position.set(0, 1.0, 0);
    body.add(head);

    // Eyes
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.8, roughness: 0.2 });
    const eyes = createPairedMesh(new THREE.SphereGeometry(0.06, 32, 32), eyeMaterial, {
        right: { x: 0.15, y: 0.1, z: 0.20 },
        left: { x: -0.15, y: 0.1, z: 0.20 }
    });
    head.add(eyes.right);
    head.add(eyes.left);

    // Shoulders
    const shoulders = createPairedMesh(new THREE.SphereGeometry(0.1, 32, 32), robotMaterial, {
        right: { x: 0.5, y: 0.5, z: 0 },
        left: { x: -0.5, y: 0.5, z: 0 }
    }, showAxes, axesSize * 0.7);
    body.add(shoulders.right);
    body.add(shoulders.left);

    // Upper Arms
    const upperArms = createPairedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 32), robotMaterial, {
        right: { x: 0, y: -0.25, z: 0 },
        left: { x: 0, y: -0.25, z: 0 }
    });
    shoulders.right.add(upperArms.right);
    shoulders.left.add(upperArms.left);

    // Elbows
    const elbows = createPairedMesh(new THREE.SphereGeometry(0.08, 32, 32), robotMaterial, {
        right: { x: 0, y: -0.3, z: 0 },
        left: { x: 0, y: -0.3, z: 0 }
    }, showAxes, axesSize * 0.6);
    upperArms.right.add(elbows.right);
    upperArms.left.add(elbows.left);

    // Forearms
    const forearms = createPairedMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 32), robotMaterial, {
        right: { x: 0, y: -0.35, z: 0 },
        left: { x: 0, y: -0.35, z: 0 }
    });
    elbows.right.add(forearms.right);
    elbows.left.add(forearms.left);

    // Grippers
    const grippers = createPairedMesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), robotMaterial, {
        right: { x: 0, y: -0.35, z: 0 },
        left: { x: 0, y: -0.35, z: 0 }
    }, showAxes, axesSize * 0.5);
    forearms.right.add(grippers.right);
    forearms.left.add(grippers.left);

    // Legs
    const legs = createPairedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 32), robotMaterial, {
        right: { x: 0.25, y: -1.25, z: 0 },
        left: { x: -0.25, y: -1.25, z: 0 }
    });
    body.add(legs.right);
    body.add(legs.left);

    robot.scale.set(0.8, 0.8, 0.8);
    robot.position.set(0, 0, 1.7);
    robot.rotation.set(Math.PI * 0.5, 0, 0);
    scene.add(robot);

    if (enableShadows) {
        robot.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }   
        });
    }

    // Return robot with accessible joints for animation
    // Ensure shoulders start at rest position (0, 0, 0)
    shoulders.right.rotation.set(0, 0, 0);
    shoulders.left.rotation.set(0, 0, 0);
    
    return { 
        robot, 
        body, 
        robotMaterial,
        eyeMaterial,
        shoulders, 
        upperArms, 
        elbows, 
        forearms, 
        grippers 
    };
}

function addMaterialPropertyIfAvailable(folder, material, property, min, max, step, name) {
    if (material && property in material) {
        folder.add(material, property, min, max, step).name(name);
    }
}

function addMaterialColorIfAvailable(folder, material, label = 'Color') {
    if (material && material.color) {
        const colorState = { color: material.color.getHex() };
        folder.addColor(colorState, 'color').name(label).onChange((value) => material.color.setHex(value));
    }
}

// Adds lil-gui controls for robot and environment object materials.
export function addMaterialControls(gui, robotData, environmentObjects) {
    const materialFolder = gui.addFolder('Materials');

    if (robotData && robotData.robotMaterial) {
        const robotFolder = materialFolder.addFolder('Robot');
        addMaterialColorIfAvailable(robotFolder, robotData.robotMaterial);
        addMaterialPropertyIfAvailable(robotFolder, robotData.robotMaterial, 'metalness', 0, 1, 0.01, 'Metalness');
        addMaterialPropertyIfAvailable(robotFolder, robotData.robotMaterial, 'roughness', 0, 1, 0.01, 'Roughness');
    }

    if (robotData && robotData.eyeMaterial) {
        const eyeFolder = materialFolder.addFolder('Robot Eyes');
        addMaterialColorIfAvailable(eyeFolder, robotData.eyeMaterial);
        addMaterialPropertyIfAvailable(eyeFolder, robotData.eyeMaterial, 'metalness', 0, 1, 0.01, 'Metalness');
        addMaterialPropertyIfAvailable(eyeFolder, robotData.eyeMaterial, 'roughness', 0, 1, 0.01, 'Roughness');
    }

    const objectEntries = [
        ['Floor', environmentObjects?.floor],
        ['Walls', environmentObjects?.backWall],
        ['Counter', environmentObjects?.counter],
        ['Glass', environmentObjects?.glass],
        ['Plate', environmentObjects?.plate]
    ];

    objectEntries.forEach(([label, mesh]) => {
        if (!mesh || !mesh.material) return;

        const objectFolder = materialFolder.addFolder(label);
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (!material) return;

        try {
            addMaterialColorIfAvailable(objectFolder, material);

            if (label !== 'Floor' && label !== 'Counter') {
                addMaterialPropertyIfAvailable(objectFolder, material, 'metalness', 0, 1, 0.01, 'Metalness');
            }

            if (label !== 'Counter') {
                addMaterialPropertyIfAvailable(objectFolder, material, 'roughness', 0, 1, 0.01, 'Roughness');
                addMaterialPropertyIfAvailable(objectFolder, material, 'transmission', 0, 1, 0.01, 'Transmission');
            }

            addMaterialPropertyIfAvailable(objectFolder, material, 'ior', 1, 2.5, 0.01, 'IOR');
            addMaterialPropertyIfAvailable(objectFolder, material, 'thickness', 0, 2, 0.01, 'Thickness');
        } catch (error) {
            console.warn(`Material controls could not be created for ${label}:`, error);
        }
    });

    return materialFolder;
}

export function setCameraTarget(controls, targetPosition) {
    controls.target.copy(targetPosition);
    controls.update();
}

export function addLightControls(gui, lights) {
    // Point Light Controls
    const pointLightFolder = gui.addFolder('Point Light');
    pointLightFolder.add(lights.pointLight, 'intensity', 0, 2, 0.1).name('Intensity');
    pointLightFolder.add(lights.pointLight.position, 'x', -5, 5, 0.1).name('Position X');
    pointLightFolder.add(lights.pointLight.position, 'y', -5, 5, 0.1).name('Position Y');
    pointLightFolder.add(lights.pointLight.position, 'z', -5, 5, 0.1).name('Position Z');
    pointLightFolder.addColor({ color: lights.pointLight.color.getHex() }, 'color')
        .onChange((value) => lights.pointLight.color.setHex(value))
        .name('Color');

    // Directional Light Controls
    const directionalLightFolder = gui.addFolder('Directional Light');
    directionalLightFolder.add(lights.directionalLight, 'intensity', 0, 2, 0.1).name('Intensity');
    directionalLightFolder.add(lights.directionalLight.position, 'x', -5, 5, 0.1).name('Position X');
    directionalLightFolder.add(lights.directionalLight.position, 'y', -5, 5, 0.1).name('Position Y');
    directionalLightFolder.add(lights.directionalLight.position, 'z', -5, 5, 0.1).name('Position Z');
    directionalLightFolder.addColor({ color: lights.directionalLight.color.getHex() }, 'color')
        .onChange((value) => lights.directionalLight.color.setHex(value))
        .name('Color');
}

function ensureXRButton(buttonType, initialLabel) {
    const selector = `[data-xr-button="${buttonType}"]`;
    let button = document.querySelector(selector);

    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.dataset.xrButton = buttonType;
        button.style.position = 'fixed';
        button.style.left = '20px';
        button.style.width = '160px';
        button.style.padding = '10px 8px';
        button.style.border = '1px solid rgba(255,255,255,0.85)';
        button.style.borderRadius = '6px';
        button.style.background = 'rgba(0,0,0,0.55)';
        button.style.color = '#ffffff';
        button.style.font = '12px monospace';
        button.style.zIndex = '25';
        button.style.bottom = buttonType === 'vr' ? '20px' : '78px';
        document.body.appendChild(button);
    }

    if (initialLabel) {
        button.textContent = initialLabel;
    }

    button.title = buttonType === 'vr' ? 'Start VR session' : 'Start AR session';
    return button;
}

function setXRButtonState(button, { label, enabled, onClick }) {
    if (!button) return;

    button.textContent = label;
    button.style.opacity = enabled ? '1' : '0.6';
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    button.style.pointerEvents = enabled ? 'auto' : 'none';
    button.disabled = !enabled;

    button.onclick = enabled
        ? async (event) => {
            event.preventDefault();
            event.stopPropagation()
            
            
            
            
            
            
            
            
            ;
            await onClick();
        }
        : null;
}

async function isModeSupported(mode) {
    if (!navigator.xr) return false;

    try {
        return await navigator.xr.isSessionSupported(mode);
    } catch {
        return false;
    }
}

export async function getXRDiagnostics() {
    const inIframe = window.self !== window.top;
    const secureContext = window.isSecureContext;
    const hasXR = Boolean(navigator.xr);
    const vrSupported = await isModeSupported('immersive-vr');
    const arSupported = await isModeSupported('immersive-ar');

    return {
        inIframe,
        secureContext,
        hasXR,
        vrSupported,
        arSupported
    };
}

function isXRWebGLBindingError(error) {
    return String(error?.message || error).includes('XRWebGLBinding');
}

function disableNativeXRWebGLBindingForPolyfill() {
    if (typeof window.XRWebGLBinding === 'undefined') return false;

    try {
        function XRWebGLBindingStub() {}
        XRWebGLBindingStub.prototype = {};
        window.XRWebGLBinding = XRWebGLBindingStub;
        console.warn('Replaced native XRWebGLBinding with compatibility stub for emulator session retry.');
        return true;
    } catch {
        return false;
    }
}

async function requestXRSession(mode) {
    const arCandidates = [
        {
            optionalFeatures: ['local-floor', 'dom-overlay'],
            domOverlay: { root: document.body }
        },
        {
            optionalFeatures: ['local-floor']
        },
        {}
    ];

    const vrCandidates = [
        {
            optionalFeatures: ['local-floor']
        },
        {}
    ];

    const candidates = mode === 'immersive-ar' ? arCandidates : vrCandidates;
    let lastError = null;

    for (const sessionInit of candidates) {
        try {
            return await navigator.xr.requestSession(mode, sessionInit);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

async function tryStartXRSession(renderer, mode) {
    if (!navigator.xr) return false;

    try {
        const gl = renderer.getContext();
        if (gl && typeof gl.makeXRCompatible === 'function') {
            try {
                await gl.makeXRCompatible();
            } catch (compatError) {
                console.warn('makeXRCompatible failed, continuing with emulator fallback path:', compatError);
            }
        }

        const session = await requestXRSession(mode);

        try {
            await renderer.xr.setSession(session);
            return true;
        } catch (error) {
            if (!isXRWebGLBindingError(error)) throw error;

            const patched = disableNativeXRWebGLBindingForPolyfill();
            if (!patched) throw error;

            try {
                await session.end();
            } catch {
                // Ignore end failure and try to open a fresh session.
            }

            const retrySession = await requestXRSession(mode);
            await renderer.xr.setSession(retrySession);
            return true;
        }
    } catch (error) {
        console.warn(`Failed to start ${mode} session:`, error);
        return false;
    }
}

async function launchXRWithFallback(renderer, preferredMode, fallbackMode = null) {
    if (renderer.xr.isPresenting) {
        const activeSession = renderer.xr.getSession();
        if (activeSession) {
            await activeSession.end();
        }
        return true;
    }

    let started = await tryStartXRSession(renderer, preferredMode);
    if (!started && fallbackMode) {
        console.info(`Primary mode ${preferredMode} failed. Trying ${fallbackMode}.`);
        started = await tryStartXRSession(renderer, fallbackMode);
    }

    return started;
}

function createControllerPointer(controller, color) {
    const existingPointer = controller.getObjectByName('xr-controller-pointer');
    if (existingPointer) return existingPointer;

    const geometry = new THREE.BoxGeometry(0.04, 0.04, 0.08);
    const material = new THREE.MeshBasicMaterial({ color });
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.05;
    pointer.name = 'xr-controller-pointer';
    controller.add(pointer);
    return pointer;
}

function createControllerRay(controller, color) {
    const existingRay = controller.getObjectByName('xr-controller-ray');
    if (existingRay) return existingRay;

    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({ color });
    const ray = new THREE.Line(rayGeometry, rayMaterial);
    ray.scale.z = 2.0;
    ray.name = 'xr-controller-ray';
    controller.add(ray);
    return ray;
}

export function setControllerRaysVisible(xrSetup, visible) {
    if (!xrSetup) return;

    if (xrSetup.ray1) xrSetup.ray1.visible = visible;
    if (xrSetup.ray2) xrSetup.ray2.visible = visible;
    if (xrSetup.xrState) xrSetup.xrState.showRays = visible;
}

export function setupWebXR(renderer, scene, options = {}) {
    const {
        environmentObjects = null,
        createButtons = true,
        createVRButton = true,
        createARButton = true,
        onSessionStart = null,
        onSessionEnd = null
    } = options;

    const xrState = {
        isARSession: false,
        sessionMode: 'none',
        showRays: true,
        launchInProgress: false
    };

    let vrButton = null;
    let arButton = null;

    if (createButtons) {
        if (createVRButton) {
            vrButton = ensureXRButton('vr', 'ENTER VR');
        }
        if (createARButton) {
            arButton = ensureXRButton('ar', 'START AR');
        }

        const launchMode = async (preferredMode, fallbackMode = null) => {
            if (xrState.launchInProgress) return;

            xrState.launchInProgress = true;
            try {
                const started = await launchXRWithFallback(renderer, preferredMode, fallbackMode);
                if (!started) {
                    console.warn(`Unable to start XR session for ${preferredMode}.`);
                }
            } finally {
                xrState.launchInProgress = false;
            }
        };

        // Default handlers are active immediately; diagnostics may refine labels/mode mapping.
        if (vrButton) {
            setXRButtonState(vrButton, {
                label: 'ENTER VR',
                enabled: true,
                onClick: async () => launchMode('immersive-vr', createARButton ? 'immersive-ar' : null)
            });
        }
        if (arButton) {
            setXRButtonState(arButton, {
                label: 'START AR',
                enabled: true,
                onClick: async () => launchMode('immersive-ar', 'immersive-vr')
            });
        }

        getXRDiagnostics().then((diagnostics) => {

            const updateVRButton = () => {
                if (!vrButton) return;
                
                if (diagnostics.vrSupported) {
                    setXRButtonState(vrButton, {
                        label: 'ENTER VR',
                        enabled: true,
                        onClick: async () => launchMode('immersive-vr')
                    });
                } else if (diagnostics.arSupported && createARButton) {
                    setXRButtonState(vrButton, {
                        label: 'ENTER XR (AR)',
                        enabled: true,
                        onClick: async () => launchMode('immersive-ar')
                    });
                } else {
                    setXRButtonState(vrButton, {
                        label: 'VR UNSUPPORTED',
                        enabled: false,
                        onClick: async () => {}
                    });
                }
            };

            const updateARButton = () => {
                if (!arButton) return;
                
                if (diagnostics.arSupported) {
                    setXRButtonState(arButton, {
                        label: 'START AR',
                        enabled: true,
                        onClick: async () => launchMode('immersive-ar', diagnostics.vrSupported ? 'immersive-vr' : null)
                    });
                } else if (diagnostics.vrSupported) {
                    setXRButtonState(arButton, {
                        label: 'ENTER XR (VR)',
                        enabled: true,
                        onClick: async () => launchMode('immersive-vr')
                    });
                } else {
                    setXRButtonState(arButton, {
                        label: 'AR UNSUPPORTED',
                        enabled: false,
                        onClick: async () => {}
                    });
                }
            };

            updateVRButton();
            updateARButton();
        }).catch(() => {});
    }

    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    const controllerGrip2 = renderer.xr.getControllerGrip(1);

    if (!controller1.parent) scene.add(controller1);
    if (!controller2.parent) scene.add(controller2);
    if (!controllerGrip1.parent) scene.add(controllerGrip1);
    if (!controllerGrip2.parent) scene.add(controllerGrip2);

    const controllerVisual1 = createControllerPointer(controller1, 0xff4d6d);
    const controllerVisual2 = createControllerPointer(controller2, 0x4d9dff);
    const ray1 = createControllerRay(controller1, 0x00ff88);
    const ray2 = createControllerRay(controller2, 0x00ff88);

function setupControllerEvents(controller) {
    controller.userData.squeezePressed = false;
    controller.userData.selectPressed = false;

    controller.addEventListener('squeezestart', () => { controller.userData.squeezePressed = true; });
    controller.addEventListener('squeezeend', () => { controller.userData.squeezePressed = false; });
    controller.addEventListener('selectstart', () => { controller.userData.selectPressed = true; });
    controller.addEventListener('selectend', () => { controller.userData.selectPressed = false; });
}

    [controller1, controller2].forEach(setupControllerEvents);

    function handleSessionStart() {
        const session = renderer.xr.getSession();
        const blendMode = session?.environmentBlendMode;
        const isARSession = session?.mode === 'immersive-ar' || blendMode === 'alpha-blend' || blendMode === 'additive';

        xrState.isARSession = Boolean(isARSession);
        xrState.sessionMode = session?.mode || 'unknown';

        if (environmentObjects) {
            setEnvironmentARMode(environmentObjects, xrState.isARSession, scene, renderer);
        }

        if (typeof onSessionStart === 'function') {
            onSessionStart({ session, xrState });
        }
    }

    function handleSessionEnd() {
        xrState.isARSession = false;
        xrState.sessionMode = 'none';

        if (environmentObjects) {
            setEnvironmentARMode(environmentObjects, false, scene, renderer);
        }

        if (typeof onSessionEnd === 'function') {
            onSessionEnd({ xrState });
        }
    }

    renderer.xr.addEventListener('sessionstart', handleSessionStart);
    renderer.xr.addEventListener('sessionend', handleSessionEnd);

    return {
        renderer,
        vrButton,
        arButton,
        controller1,
        controller2,
        controllerGrip1,
        controllerGrip2,
        controllerVisual1,
        controllerVisual2,
        ray1,
        ray2,
        xrState
    };
}

// Encapsulates XR/AR orchestration for the kitchen robot scene so pages stay minimal.
export function setupXRKitchenExperience({
    renderer,
    scene,
    camera,
    controls,
    gui,
    environment,
    robotData,
    lights
}) {
    const xrContentRoot = new THREE.Group();
    scene.add(xrContentRoot);

    xrContentRoot.add(environment.floor);
    xrContentRoot.add(environment.backWall);
    xrContentRoot.add(environment.leftWall);
    xrContentRoot.add(environment.counter);
    xrContentRoot.add(environment.glass);
    xrContentRoot.add(environment.plate);
    xrContentRoot.add(robotData.robot);
    xrContentRoot.add(lights.pointLight);
    xrContentRoot.add(lights.directionalLight);

    // Scale down the entire scene for better XR proportions.
    xrContentRoot.scale.set(0.5, 0.5, 0.5);

    const xrRootDefaultState = {
        position: xrContentRoot.position.clone(),
        quaternion: xrContentRoot.quaternion.clone(),
        scale: xrContentRoot.scale.clone()
    };

    const arScenePosition = {
        x: 0,
        y: -1,
        z: 0
    };

    const xrPlacement = {
        pending: false,
        followViewer: true,
        distance: 3.5,
        heightOffset: -1.2,
        arExtraDistance: 1.25
    };

    const lightingDefaults = {
        ambient: lights.ambientLight.intensity,
        point: lights.pointLight.intensity,
        directional: lights.directionalLight.intensity,
        shadowEnabled: renderer.shadowMap.enabled
    };

    function resetRobotPose() {
        if (robotData.shoulders) {
            robotData.shoulders.right.rotation.set(0, 0, 0);
            robotData.shoulders.left.rotation.set(0, 0, 0);
        }
        if (robotData.elbows) {
            robotData.elbows.right.rotation.set(0, 0, 0);
            robotData.elbows.left.rotation.set(0, 0, 0);
        }
        if (robotData.forearms) {
            robotData.forearms.right.rotation.set(0, 0, 0);
            robotData.forearms.left.rotation.set(0, 0, 0);
        }
        if (robotData.grippers) {
            robotData.grippers.right.scale.set(1, 1, 1);
            robotData.grippers.right.rotation.set(0, 0, 0);
            robotData.grippers.left.scale.set(1, 1, 1);
            robotData.grippers.left.rotation.set(0, 0, 0);
        }
    }

    function applyARVisualTuning(enabled) {
        if (enabled) {
            // Disable shadow mapping in AR to avoid overly dark, blotchy shading.
            renderer.shadowMap.enabled = false;
            lights.ambientLight.intensity = Math.max(lightingDefaults.ambient, 1.8);
            lights.pointLight.intensity = Math.min(lightingDefaults.point, 1.2);
            lights.directionalLight.intensity = Math.min(lightingDefaults.directional, 0.2);
        } else {
            renderer.shadowMap.enabled = lightingDefaults.shadowEnabled;
            lights.ambientLight.intensity = lightingDefaults.ambient;
            lights.pointLight.intensity = lightingDefaults.point;
            lights.directionalLight.intensity = lightingDefaults.directional;
        }
    }

    function placeContentFromXRCamera() {
        const xrCamera = renderer.xr.getCamera(camera);
        if (!xrCamera) return;

        const isARSession = renderer.xr.getSession()?.mode === 'immersive-ar';
        const effectiveDistance = xrPlacement.distance + (isARSession ? xrPlacement.arExtraDistance : 0);

        const cameraPosition = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        xrCamera.getWorldPosition(cameraPosition);

        const cameraQuaternion = xrCamera.getWorldQuaternion(new THREE.Quaternion());
        cameraDirection.applyQuaternion(cameraQuaternion);
        cameraDirection.y = 0;

        if (!Number.isFinite(cameraPosition.x) || !Number.isFinite(cameraPosition.y) || !Number.isFinite(cameraPosition.z)) {
            return;
        }

        if (!Number.isFinite(cameraDirection.x) || !Number.isFinite(cameraDirection.y) || !Number.isFinite(cameraDirection.z) || cameraDirection.lengthSq() < 1e-6) {
            cameraDirection.set(0, 0, -1);
        } else {
            cameraDirection.normalize();
        }

        // Keep authored z-up scene by rotating root into y-up XR space.
        xrContentRoot.rotation.set(-Math.PI * 0.5, 0, 0);

        const contentPosition = cameraPosition
            .clone()
            .addScaledVector(cameraDirection, effectiveDistance);
        contentPosition.y += xrPlacement.heightOffset;

        xrContentRoot.position.copy(contentPosition);
        xrContentRoot.scale.set(1, 1, 1);
    }

    function applyARScenePosition() {
        xrContentRoot.rotation.set(-Math.PI * 0.5, 0, 0);
        xrContentRoot.position.set(arScenePosition.x, arScenePosition.y, arScenePosition.z);
        xrContentRoot.scale.set(0.7, 0.7, 0.7);
    }

    function restoreDesktopContentPose() {
        xrContentRoot.position.copy(xrRootDefaultState.position);
        xrContentRoot.quaternion.copy(xrRootDefaultState.quaternion);
        xrContentRoot.scale.copy(xrRootDefaultState.scale);
    }

    resetRobotPose();

    const xrSetup = setupWebXR(renderer, scene, {
        environmentObjects: environment,
        createButtons: true,
        onSessionStart: ({ xrState }) => {
            renderer.setPixelRatio(1);
            renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);

            const isARSession = Boolean(xrState?.isARSession);
            xrPlacement.pending = !isARSession;
            applyARVisualTuning(isARSession);

            if (isARSession) {
                applyARScenePosition();
            }

            resetRobotPose();

            // Keep AR content stable. Controller alignment is for VR only.
            if (!isARSession) {
                try {
                    const rightCtrl = xrSetup?.controllerGrip1 || xrSetup?.controller1 || null;
                    const leftCtrl = xrSetup?.controllerGrip2 || xrSetup?.controller2 || null;

                    const deltas = [];
                    if (rightCtrl && robotData.grippers?.right) {
                        const cpos = new THREE.Vector3();
                        rightCtrl.getWorldPosition(cpos);
                        const gpos = new THREE.Vector3();
                        robotData.grippers.right.getWorldPosition(gpos);
                        deltas.push(cpos.sub(gpos));
                    }
                    if (leftCtrl && robotData.grippers?.left) {
                        const cpos = new THREE.Vector3();
                        leftCtrl.getWorldPosition(cpos);
                        const gpos = new THREE.Vector3();
                        robotData.grippers.left.getWorldPosition(gpos);
                        deltas.push(cpos.sub(gpos));
                    }

                    if (deltas.length) {
                        const avg = deltas.reduce((a, b) => a.add(b), new THREE.Vector3(0, 0, 0)).multiplyScalar(1 / deltas.length);
                        xrContentRoot.position.add(avg);
                    }
                } catch (err) {
                    console.warn('XR alignment failed:', err);
                }
            }

            try {
                if (teleopStateLocal && typeof teleopStateLocal.resetBaseline === 'function') {
                    teleopStateLocal.resetBaseline();
                }
            } catch (err) {
                console.warn('resetBaseline failed on session start', err);
            }

        },
        onSessionEnd: () => {
            applyARVisualTuning(false);
            restoreDesktopContentPose();
        }
    });

    const xrPlacementFolder = gui.addFolder('XR Placement');
    xrPlacementFolder.add(xrPlacement, 'followViewer').name('Follow Viewer');
    xrPlacementFolder.add(xrPlacement, 'distance', 0.6, 4.0, 0.1).name('Distance');
    xrPlacementFolder.add(xrPlacement, 'arExtraDistance', 0, 3.0, 0.05).name('AR Extra Distance');
    xrPlacementFolder.add(xrPlacement, 'heightOffset', -2.0, 0.5, 0.05).name('Height Offset');
    xrPlacementFolder.add({ recenter: () => {
        if (renderer.xr.isPresenting) {
            placeContentFromXRCamera();
        }
    } }, 'recenter').name('Recenter');

    const arPositionFolder = gui.addFolder('AR Scene Position');
    const applyARPositionIfActive = () => {
        if (renderer.xr.isPresenting && xrSetup?.xrState?.isARSession) {
            applyARScenePosition();
        }
    };
    arPositionFolder.add(arScenePosition, 'x', -5, 5, 0.01).name('X').onChange(applyARPositionIfActive);
    arPositionFolder.add(arScenePosition, 'y', -5, 5, 0.01).name('Y').onChange(applyARPositionIfActive);
    arPositionFolder.add(arScenePosition, 'z', -5, 5, 0.01).name('Z').onChange(applyARPositionIfActive);
    arPositionFolder.add({ resetToOriginal: () => {
        arScenePosition.x = xrRootDefaultState.position.x;
        arScenePosition.y = xrRootDefaultState.position.y;
        arScenePosition.z = xrRootDefaultState.position.z;
        applyARPositionIfActive();
    } }, 'resetToOriginal').name('Reset To Original');

    const teleopStateLocal = createDirectHandTeleop(
        robotData,
        xrSetup.controller1,
        xrSetup.controller2,
        xrSetup.controllerGrip1,
        xrSetup.controllerGrip2
    );

    addXRControls(gui, xrSetup, teleopStateLocal, environment, scene);

    function tick() {
        const gl = renderer.getContext();

        if (renderer.xr.isPresenting && (gl.drawingBufferWidth <= 0 || gl.drawingBufferHeight <= 0)) {
            renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
            return false;
        }

        if (!renderer.xr.isPresenting) {
            controls.update();
        } else {
            const isARSession = Boolean(xrSetup?.xrState?.isARSession);

            if (isARSession) {
                applyARScenePosition();
            } else if (xrPlacement.pending || xrPlacement.followViewer) {
                placeContentFromXRCamera();
                xrPlacement.pending = false;
            }
        }

        const isARSession = Boolean(xrSetup?.xrState?.isARSession);

        if (!isARSession) {
            updateDirectHandTeleop(teleopStateLocal, xrSetup);
        }

        if (!renderer.xr.isPresenting || !teleopStateLocal.enabled || isARSession) {
            animateRobotFK(robotData);
        }

        applyARClear(renderer);
        return true;
    }

    return {
        xrSetup,
        teleopState: teleopStateLocal,
        tick
    };
}

export function createDirectHandTeleop(robotData, controller1, controller2, controllerGrip1 = null, controllerGrip2 = null) {
    // Prefer grip controllers (better pose) over ray controllers
    const rightCtrl = controllerGrip1 || controller1;
    const leftCtrl  = controllerGrip2 || controller2;

    const state = {
        enabled: true,
        showControllerRays: true,
        squeezeStrength: 0.45,
        gripLerp: 0.2,

        // Raw controller references needed for button state
        controller1,
        controller2,

        // Controller objects used for position tracking
        rightCtrl,
        leftCtrl,

        // Robot joint references
        rightShoulder: robotData?.shoulders?.right || null,
        leftShoulder:  robotData?.shoulders?.left  || null,
        rightElbow:    robotData?.elbows?.right    || null,
        leftElbow:     robotData?.elbows?.left     || null,
        rightGripper:  robotData?.grippers?.right  || null,
        leftGripper:   robotData?.grippers?.left   || null,

        // Baseline — captured on the first live tracking frame
        baseline: {
            captured: false,          // true once we have a valid snapshot
            pending:  true,           // triggers a re-capture on next live frame
            settleFrames: 0,          // counts consecutive tracked frames before capture

            // Controller world positions at capture time
            rightCtrlPos: new THREE.Vector3(),
            leftCtrlPos:  new THREE.Vector3(),

            // Shoulder rotations at capture time (the rest pose we want to preserve)
            rightShoulderRot: new THREE.Euler(),
            leftShoulderRot:  new THREE.Euler(),
        }
    };

    // Call this to schedule a re-capture (e.g. when entering VR, or from GUI button).
    // The actual snapshot happens on the next frame where controllers are tracked.
    state.resetBaseline = function () {
        state.baseline.captured     = false;
        state.baseline.pending      = true;
        state.baseline.settleFrames = 0;
    };

    return state;
}

export function setDirectHandTeleopEnabled(teleopState, enabled) {
    if (!teleopState) return;
    teleopState.enabled = enabled;
}

function getControllerPositions(rightCtrl, leftCtrl) {
    const rightPos = new THREE.Vector3();
    const leftPos = new THREE.Vector3();
    rightCtrl.getWorldPosition(rightPos);
    leftCtrl.getWorldPosition(leftPos);
    return { rightPos, leftPos };
}

function isControllerTracked(rightPos, leftPos, minSq = 1e-4) {
    return rightPos.lengthSq() > minSq || leftPos.lengthSq() > minSq;
}

function captureBaseline(baseline, rightPos, leftPos, rightShoulder, leftShoulder) {
    baseline.rightCtrlPos.copy(rightPos);
    baseline.leftCtrlPos.copy(leftPos);
    baseline.rightShoulderRot.copy(rightShoulder.rotation);
    baseline.leftShoulderRot.copy(leftShoulder.rotation);
    baseline.captured = true;
    baseline.pending = false;
}

function getLocalDelta(currentPos, baselinePos, parentObject) {
    // Compute the raw world-space movement vector
    const worldDelta = currentPos.clone().sub(baselinePos);

    // Rotate it into the parent's local orientation WITHOUT applying position or scale.
    // Using only the quaternion means an xrContentRoot scale of 0.5 or a position shift
    // won't corrupt the delta — only the rotational frame matters for mapping axes.
    const parentQuat = new THREE.Quaternion();
    parentObject.getWorldQuaternion(parentQuat);
    parentQuat.invert();

    return worldDelta.applyQuaternion(parentQuat);
}

function updateShoulderRotation(shoulder, isRight, delta, baseline) {
    shoulder.rotation.order = 'XYZ';

    const restX = isRight ? baseline.rightShoulderRot.x : baseline.leftShoulderRot.x;
    const restZ = isRight ? baseline.rightShoulderRot.z : baseline.leftShoulderRot.z;
    const SCALE = 2.0;

    // Confirmed from measured console output:
    //   delta.y → up/down      (green arrow: up = +y)
    //   delta.z → forward/back (blue arrow:  forward = -z, backward = +z)
    //   delta.x → left/right   (red arrow:   right = +x for BOTH controllers)
    //
    // Arm hangs along local -Y. Rotations:
    //   rotation.z swings arm sideways/upward
    //   rotation.x tips arm forward/backward
    //
    // RIGHT arm — outward = more positive rotation.z:
    //   move right (+x) → outward → +z  use +delta.x ✓
    //   move up    (+y) → raises  → +z  use +delta.y ✓
    //
    // LEFT arm — outward = more negative rotation.z:
    //   move left  (−x) → outward → −z  need swingDelta negative when x is negative
    //                                   MEASURED: +delta.x moves arm wrong way → use −delta.x ✓
    //   move up    (+y) → raises  → −z  need swingDelta negative when y is positive → use −delta.y ✓
    //
    // FORWARD/BACK — same for both arms:
    //   forward (−z) → arm reaches forward → negative rotation.x → use +delta.z ✓

    const swingDelta = isRight
        ? ( delta.x + delta.y)   // right: right=out(+z), up=out(+z)
        : ( delta.x - delta.y);  // left:  right=out(+x inverted by constraint), up=out(−z)

    const newZ = THREE.MathUtils.clamp(
        restZ + swingDelta * SCALE,
        isRight ? restZ           : restZ - Math.PI,
        isRight ? restZ + Math.PI : restZ
    );

    // Forward/back (rotation.x):
    //   backward (+delta.z) → +rotation.x (arm tips back)
    //   forward  (-delta.z) → -rotation.x (arm reaches forward)
    const newX = THREE.MathUtils.clamp(
        restX + (delta.z * SCALE),
        -Math.PI * 0.5,   // 90° forward
         Math.PI * 0.25   // 45° backward
    );

    shoulder.rotation.x = newX;
    shoulder.rotation.y = 0;
    shoulder.rotation.z = newZ;
}

function updateGripperState(gripper, isPressed, squeezeStrength, gripLerp) {
    if (!gripper) return;
    const closedScale = Math.max(0.2, 1 - squeezeStrength);
    gripper.scale.y = THREE.MathUtils.lerp(
        gripper.scale.y,
        isPressed ? closedScale : 1,
        gripLerp
    );
}

function isButtonPressed(controller) {
    return Boolean(
        controller?.userData?.squeezePressed ||
        controller?.userData?.selectPressed
    );
}

export function updateDirectHandTeleop(teleopState, xrSetup = null) {
    if (!teleopState) return;

    if (xrSetup) {
        setControllerRaysVisible(xrSetup, teleopState.showControllerRays);
    }

    const isPresenting = Boolean(xrSetup?.renderer?.xr?.isPresenting);
    if (!teleopState.enabled || !isPresenting) return;

    const { rightCtrl, leftCtrl, rightShoulder, leftShoulder, rightGripper, leftGripper, baseline, controller1, controller2 } = teleopState;
    if (!rightCtrl || !leftCtrl || !rightShoulder || !leftShoulder) return;

    const { rightPos, leftPos } = getControllerPositions(rightCtrl, leftCtrl);
    
    if (!isControllerTracked(rightPos, leftPos)) return;

    if (baseline.pending && !baseline.captured) {
        // Wait for SETTLE_FRAMES consecutive tracked frames before locking the baseline.
        // This ensures placeContentFromXRCamera has run and the body's world quaternion
        // reflects the true XR orientation — preventing a wrong initial arm position.
        const SETTLE_FRAMES = 5;
        baseline.settleFrames++;
        if (baseline.settleFrames >= SETTLE_FRAMES) {
            captureBaseline(baseline, rightPos, leftPos, rightShoulder, leftShoulder);
        }
        return;
    }

    const deltaRight = getLocalDelta(rightPos, baseline.rightCtrlPos, rightShoulder.parent);
    const deltaLeft = getLocalDelta(leftPos, baseline.leftCtrlPos, leftShoulder.parent);

    updateShoulderRotation(rightShoulder, true,  deltaRight, baseline);
    updateShoulderRotation(leftShoulder,  false, deltaLeft,  baseline);

    updateGripperState(rightGripper, isButtonPressed(controller1), teleopState.squeezeStrength, teleopState.gripLerp);
    updateGripperState(leftGripper, isButtonPressed(controller2), teleopState.squeezeStrength, teleopState.gripLerp);
}

export function addXRControls(gui, xrSetup, teleopState, environmentObjects = null, scene = null) {
    if (!gui || !teleopState) return null;

    const xrFolder = gui.addFolder('XR Teleoperation');

    xrFolder.add(teleopState, 'enabled').name('Enable Teleop')
        .onChange((value) => setDirectHandTeleopEnabled(teleopState, value));

    xrFolder.add(teleopState, 'showControllerRays').name('Show Rays')
        .onChange((value) => setControllerRaysVisible(xrSetup, value));

    xrFolder.add(teleopState, 'squeezeStrength', 0.1, 0.9, 0.01).name('Grip Close');

    // Re-zero: call this after repositioning the emulator controllers, or whenever
    // the arms drift from their expected rest pose.
    xrFolder.add({ reZero: () => {
        if (typeof teleopState.resetBaseline === 'function') {
            teleopState.resetBaseline();
        }
    } }, 'reZero').name('Re-zero Arms');

    if (environmentObjects) {
        const previewState = { enabled: false };
        xrFolder.add(previewState, 'enabled').name('AR Wall Preview')
            .onChange((value) => {
                const activeARSession = Boolean(xrSetup?.xrState?.isARSession);
                if (!activeARSession) {
                    setEnvironmentARMode(environmentObjects, value, scene);
                }
            });
    }

    return xrFolder;
}

// Animation state object to control FK animation
export const animationState = {
    isAutoAnimating: true,
    shoulderRotationX: 0,
    shoulderRotationZ: 0,
    elbowRotationX: 0,
    gripperRotationZ: 0,
    speed: 1
};

// Function to animate robot using Forward Kinematics (FK)
export function animateRobotFK(robotData) {
    if (!robotData || !robotData.shoulders || !robotData.elbows) return;

    if (animationState.isAutoAnimating) {
        // Auto animation: smooth waving in Z direction using Date.now()
        const frequency = animationState.speed * 0.002; // Controls oscillation speed
        const now = Date.now() * frequency;

        // Shoulder rotation - waving in Z direction (side-to-side)
        // Z-rotation: main side-to-side motion with caps to prevent body collision
        let shoulderZ = Math.sin(now) * 3.0; // Side-to-side swing
        // Cap Z rotation to prevent arms from entering torso
        shoulderZ = Math.max(0.2, Math.min(3.0, shoulderZ)); 
        
        robotData.shoulders.right.rotation.z = shoulderZ;
        robotData.shoulders.left.rotation.z = -shoulderZ;
        
        // Remove up-down rotation
        robotData.shoulders.right.rotation.x = 0;
        robotData.shoulders.left.rotation.x = 0;

        // Elbow - keep in neutral position, hand waves with shoulder motion only
        robotData.elbows.right.rotation.x = 0;
        robotData.elbows.left.rotation.x = 0;

    } else {
        // Manual control via GUI
        robotData.shoulders.right.rotation.x = animationState.shoulderRotationX;
        // Cap Z rotation to prevent arms from entering torso
        const cappedShoulderZ = Math.max(0.2, Math.min(3.0, animationState.shoulderRotationZ));
        robotData.shoulders.right.rotation.z = cappedShoulderZ;
        robotData.shoulders.left.rotation.z = -cappedShoulderZ;

        robotData.elbows.right.rotation.x = animationState.elbowRotationX;
        robotData.elbows.left.rotation.x = animationState.elbowRotationX;

        robotData.grippers.right.rotation.z = animationState.gripperRotationZ;
        robotData.grippers.left.rotation.z = -animationState.gripperRotationZ;
    }
}

// Function to add robot joint controls to GUI
export function addRobotJointControls(gui, robotData) {
    const jointFolder = gui.addFolder('Robot Animation');

    // Toggle auto animation
    jointFolder.add(animationState, 'isAutoAnimating').name('Auto Animate');
    jointFolder.add(animationState, 'speed', 0.1, 2, 0.1).name('Animation Speed');

    // Manual shoulder controls
    const shoulderFolder = jointFolder.addFolder('Shoulder');
    shoulderFolder.add(animationState, 'shoulderRotationX', -Math.PI, Math.PI, 0.01).name('Rotation X');
    shoulderFolder.add(animationState, 'shoulderRotationZ', -Math.PI, Math.PI, 0.01).name('Rotation Z');

    // Manual elbow controls
    const elbowFolder = jointFolder.addFolder('Elbow');
    elbowFolder.add(animationState, 'elbowRotationX', -Math.PI, Math.PI, 0.01).name('Rotation X');
}

/**
 * Call this at the START of every frame in the render loop (before renderer.render).
 * In AR mode it clears the framebuffer to fully transparent so the passthrough camera
 * feed shows through wherever no 3D object is drawn.
 * In VR/desktop mode it does nothing.
 */
export function applyARClear(renderer) {
    const fn = renderer?.userData?._arClearFn;
    if (fn) fn();
}