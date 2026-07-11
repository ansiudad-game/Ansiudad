import Experience from '../Experience.js'
import Environment from './Environment.js'
import CityScene from './Scenes/CityScene.js'
import PortalScene from './Scenes/PortalScene.js'
import TunnelScene from './Scenes/TunnelScene.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Wait for resources
        this.resources.on('ready', () =>
        {
            // Setup
            this.environment = new Environment()

            this.CityScene = new CityScene()
            this.PortalScene = new PortalScene()
            this.TunnelScene = new TunnelScene()

            this.positionScenes()
            this.CityScene.playIntroSequence(() => {
                this.experience.events.trigger('cityIntroComplete')
            })
        })
    }
    
    positionScenes() {
        this.CityScene.group.rotateY(Math.PI / 4)
        this.CityScene.group.position.set(1, -0.5, 1);

        this.PortalScene.group.position.y = -20
        this.PortalScene.group.rotateY(Math.PI / 2)

        this.TunnelScene.group.position.y = -20
        this.TunnelScene.group.position.z = -5
    }

    update()
    {
        if (this.CityScene)
            this.CityScene.update()
        
        if (this.PortalScene)
            this.PortalScene.update()
        
        if (this.TunnelScene)
            this.TunnelScene.update()
    }
}