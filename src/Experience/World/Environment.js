import * as THREE from 'three'
import Experience from '../Experience.js'
import skyVertexShader from '../shaders/sky/mainSkyVertex.glsl'
import skyFragmentShader from '../shaders/sky/mainSkyFragment.glsl'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        
        // Debug
        if(this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder('environment')
        }

        this.setSunLight()
        this.setEnvironmentMap()
        this.setSphereBackground()
    }

    setSunLight()
    {
        this.sunLight = new THREE.DirectionalLight('#F6E294', 4)
        this.sunLight.castShadow = true
        this.sunLight.shadow.camera.far = 15
        this.sunLight.shadow.camera.right = 15
        this.sunLight.shadow.mapSize.set(1024, 1024)
        this.sunLight.shadow.normalBias = 0.05
        this.sunLight.position.set(3.5, 2, - 1.25)
        this.scene.add(this.sunLight)

        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .add(this.sunLight, 'intensity')
                .name('sunLightIntensity')
                .min(0)
                .max(10)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'x')
                .name('sunLightX')
                .min(- 5)
                .max(5)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'y')
                .name('sunLightY')
                .min(- 5)
                .max(5)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'z')
                .name('sunLightZ')
                .min(- 5)
                .max(5)
                .step(0.001)
        }
    }

    setEnvironmentMap()
    {
        this.environmentMap = {}
        this.environmentMap.intensity = 0.4
        this.environmentMap.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace
        
        this.scene.environment = this.environmentMap.texture

        this.environmentMap.updateMaterials = () =>
        {
            this.scene.traverse((child) =>
            {
                if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
                {
                    child.material.envMap = this.environmentMap.texture
                    child.material.envMapIntensity = this.environmentMap.intensity
                    child.material.needsUpdate = true
                }
            })
        }
        this.environmentMap.updateMaterials()

        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .add(this.environmentMap, 'intensity')
                .name('envMapIntensity')
                .min(0)
                .max(4)
                .step(0.001)
                .onChange(this.environmentMap.updateMaterials)
        }
    }

    setSphereBackground() {
        this.skyTexture = this.resources.items.skyTexture;
        this.skyTexture.colorSpace = THREE.LinearSRGBColorSpace

        this.background = new THREE.Mesh(
            new THREE.SphereGeometry(13, 64, 64, 0, Math.PI * 2, Math.PI * 0.2, Math.PI * 0.6),
            // new THREE.MeshBasicMaterial({
            //     color: '#F6E294',
            //     side: THREE.BackSide,
            //     map: this.skyTexture
            // })
            new THREE.ShaderMaterial({
                vertexShader: skyVertexShader,
                fragmentShader: skyFragmentShader,
                side: THREE.BackSide,
                transparent: true,
                uniforms: {
                    tMap: { value: this.skyTexture },
                    uColor: { value: new THREE.Color('#F6E294') },
                }
            })
        );

        this.scene.add(this.background)
    }
}