import * as THREE from 'three'
import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

export default class Camera
{
    constructor()
    {
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.appState = this.experience.appState

        this.initMouse()

        this.cityCamera = {
            position: { x: 0, y: 1.0, z: 6.25 },
            lookAt: { x: -0.35, y: -0.05, z: 0.4 },
            fov: 28,
        }

        this.setInstance()
        this.setControls()

        this.addHandlers();
    }

    setInstance()
    {
        this.instance = new THREE.PerspectiveCamera(this.cityCamera.fov, this.sizes.width / this.sizes.height, 0.1, 100)
        this.instance.position.set(
            this.cityCamera.position.x,
            this.cityCamera.position.y,
            this.cityCamera.position.z
        )
        this.vectorLookAt = new THREE.Vector3(
            this.cityCamera.lookAt.x,
            this.cityCamera.lookAt.y,
            this.cityCamera.lookAt.z
        )
        this.instance.lookAt(this.vectorLookAt);

        this.gazeWrapper = new THREE.Group()
        this.gazeWrapper.add(this.instance)
        this.scene.add(this.gazeWrapper)
    }

    setControls()
    {
        // this.controls = new OrbitControls(this.instance, this.canvas)
        // this.controls.enableDamping = true
    }

    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    addHandlers() {
        this.appState.on('stepChange', (newStep) => {
            if (newStep == 5 || newStep == 6) {
                this.moveToPortalScene();
            } else if (newStep == 7 || newStep == 8) {
                this.moveToTunnelScene();
            } else {
                this.moveToCityScene();
            }
        });
    }

    moveToPortalScene() {
        gsap.to(this.instance.position, { x: 0, y: -18.5, z: 8, duration: 2, ease: "power2.inOut" });
        gsap.to(this.vectorLookAt, { x: -1.5, y: -19.5, duration: 1.2, ease: "power2.inOut" });
    }
    
    moveToTunnelScene() {
        gsap.to(this.instance.position, { x: 0, y: -20, z: -2, duration: 2, ease: "power2.inOut" });
        gsap.to(this.vectorLookAt, { x: 0, y: -20, z: -10, duration: 1.2, ease: "power2.inOut" });
    }

    moveToCityScene() {
        gsap.to(this.instance.position, {
            x: this.cityCamera.position.x,
            y: this.cityCamera.position.y,
            z: this.cityCamera.position.z,
            duration: 2,
            ease: 'power2.inOut',
        })
        gsap.to(this.vectorLookAt, {
            x: this.cityCamera.lookAt.x,
            y: this.cityCamera.lookAt.y,
            z: this.cityCamera.lookAt.z,
            duration: 1.2,
            ease: 'power2.inOut',
        })
        gsap.to(this.instance, {
            fov: this.cityCamera.fov,
            duration: 2,
            ease: 'power2.inOut',
            onUpdate: () => this.instance.updateProjectionMatrix(),
        })
    }

    initMouse() {
        window.myMouse = {
            x: 0,
            y: 0,
        
            /* 
                "smooth" me refiero al valor "suavizado" de las coordenadas X y Y usando la integración de verlet, es una operación matemática que nos ayuda a "acercar" poco a poco la posicion de un objeto de un punto a otro en lugar de reescribir la posición instantaneamente.
        
                "cof" o "coeficiente de fricción" es la velocidad con la cual se va a "acercar" del punto A al punto B.
            */
            cof: 0.1,
        
            smooth: {
                x: 0,
                y: 0,
            },
        
        
            /*
                "tilt" en este caso me refiero a otro sistema de coordenadas similar al espacio 3D, donde el origen (o coordenada 0,0) es el centro, los positivos son hacia la derecha y arriba, mientras los negativos son hacia la izquierda y abajo. Los extremos de la pantalla son 1 y -1 respectivamente.
        
                "tiltSmooth" tiene la misma functión que "smooth", pero usando el valor "normalizado" en lugar del que obtenemos del evento "mousemove"
            */
            tilt: {
                x: 0,
                y: 0,
            },
            
            tiltSmooth: {
                x: 0,
                y: 0,
            },
        
            /*
                "delta" comunmente es usado para hacer referencia a la "aceleración" actual del movimiento del mouse, cuando estamos en reposo sin mover el cursor su valor es "0". 
            
                Para calcularlo necesitamos la posición anterior, de ahí que exista el atributo "last".
            */
            last: {
                x: 0,
                y: 0,
            },
            delta: {
                x: 0,
                y: 0,
            },
            deltaSmooth: {
                x: 0,
                y: 0,
            },
        }

        window.addEventListener('mousemove', this.updateMouseCoords.bind(this));
    }
    
    updateMouseCoords(eventData) {
        myMouse.x = eventData.clientX;
        myMouse.y = eventData.clientY;
    
        this.updateMouseTilt();
    
        // console.log(myMouse.x, myMouse.y);
    }

    updateMouseTilt() {
        myMouse.tilt.x = ((myMouse.x * 2) - window.innerWidth) / window.innerWidth;
        myMouse.tilt.y = ((myMouse.y * 2) - window.innerHeight) / window.innerHeight;
        myMouse.tilt.y *= -1;
    
        // console.log(myMouse.tilt.x, myMouse.tilt.y);
    }

    updateMouseExtraData() {
        // Actualizando valores "smooth" del mouse
        myMouse.smooth.x += (myMouse.x - myMouse.smooth.x) * myMouse.cof;
        myMouse.smooth.y += (myMouse.y - myMouse.smooth.y) * myMouse.cof;
        
        // Actualizando valores "tiltSmooth" del mouse
        myMouse.tiltSmooth.x += (myMouse.tilt.x - myMouse.tiltSmooth.x) * myMouse.cof;
        myMouse.tiltSmooth.y += (myMouse.tilt.y - myMouse.tiltSmooth.y) * myMouse.cof;
    
        // console.log('smooth', myMouse.smooth, myMouse.tiltSmooth);
    
    
        // Actualizando valores "delta" del mouse
        myMouse.delta.x = myMouse.x - myMouse.last.x;
        myMouse.delta.y = myMouse.y - myMouse.last.y;
    
        myMouse.last.x = myMouse.x;
        myMouse.last.y = myMouse.y;
    
        myMouse.deltaSmooth.x += (myMouse.delta.x - myMouse.deltaSmooth.x) * myMouse.cof;
        myMouse.deltaSmooth.y += (myMouse.delta.y - myMouse.deltaSmooth.y) * myMouse.cof;
    }

    update()
    {
        // this.controls.update()
        this.updateMouseExtraData();
        this.gazeWrapper.position.x = -myMouse.tiltSmooth.x * 0.35;
        this.gazeWrapper.position.y = -myMouse.tiltSmooth.y * 0.12;

        this.instance.lookAt(this.vectorLookAt);

        // this.gazeWrapper.rotateZ(myMouse.deltaSmooth.x * 0.005);
    }
}