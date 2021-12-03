import { PLYLoader } from './jsm/loaders/PLYLoader.js'
import { GUI } from './jsm/libs/dat.gui.module.js'
import {
    PerspectiveCamera,
    Vector3,
    Scene,
    Color,
    Fog,
    Mesh,
    PlaneGeometry,
    MeshPhongMaterial,
    HemisphereLight,
    DirectionalLight,
    WebGLRenderer,
    sRGBEncoding
} from './build/three.module.js'

const names = ['dolphin', 'cat', 'deer', 'hand']
// The iterations of pytorch3d models
const models = [0, 5, 10, 20, 30, 40, 50, 60, 80, 100, 130, 160, 190, 220, 250, 300, 400, 500, 600, 800, 1000, 1250, 1500, 1750, 2000]
const scene = new Scene()
scene.background = new Color(0x72645b)
scene.fog = new Fog(0x72645b, 2, 15)

const loadAssets = async (names) => {
    const material = new MeshPhongMaterial({ color: 0xAAAAAA, specular: 0x111111, shininess: 200 })
    const loadModels = n => {
        const loader = new PLYLoader()
        const location = [`./models/${n}.ply`, ...models.map(m => `./models/${n}_model_${m}.ply`)]
        const loadItem = (item, index) => new Promise(resolve => {
            loader.load(item, geometry => {
                geometry.computeVertexNormals()
                const mesh = new Mesh(geometry, material)
                mesh.name = item
                mesh.position.set(index == 0 ? -0.5 : 0.5, -0.5, 0)
                mesh.scale.multiplyScalar(1)
                mesh.castShadow = true
                mesh.receiveShadow = true
                mesh.visible = false
                scene.add(mesh)
                resolve(mesh)
            })
        })

        return Promise.all(location.map(loadItem))
    }

    const assets = {}
    const retModels = await Promise.all(names.map(async n => await loadModels(n)))

    names.forEach((n, index) => {
        assets[n] = retModels[index]
    })
    return assets
}


const init = async (assets) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // Camera
    const camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 15)
    camera.position.set(100, .015, 100)

    const cameraTarget = new Vector3(0, 0.1, 0)

    // Ground
    const plane = new Mesh(
        new PlaneGeometry(40, 40),
        new MeshPhongMaterial({ color: 0x999999, specular: 0x101010 })
    )
    plane.rotation.x = - Math.PI / 2
    plane.position.y = - 0.5
    scene.add(plane)
    plane.receiveShadow = true

    // Lights
    const addShadowedLight = (x, y, z, color, intensity) => {
        const directionalLight = new DirectionalLight(color, intensity)
        directionalLight.position.set(x, y, z)
        scene.add(directionalLight)
        directionalLight.castShadow = true

        const d = 1
        directionalLight.shadow.camera.left = -d
        directionalLight.shadow.camera.right = d
        directionalLight.shadow.camera.top = d
        directionalLight.shadow.camera.bottom = -d
        directionalLight.shadow.camera.near = 1
        directionalLight.shadow.camera.far = 4
        directionalLight.shadow.bias = -0.002
    }

    scene.add(new HemisphereLight(0x443333, 0x111122))
    addShadowedLight(1, 1, 1, 0xffffff, 1.35)
    addShadowedLight(0.5, 1, -1, 0xffaa00, 1)

    // Renderer
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputEncoding = sRGBEncoding
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    })

    const select = document.getElementById('model-select')
    names.forEach(n => {
        const option = document.createElement('option')
        option.setAttribute('value', n)
        option.appendChild(document.createTextNode(n))
        select.appendChild(option)
    })

    let gui = null
    let curModel = []
    const changeModel = () => {
        if (gui) gui.destroy()
        curModel.forEach(item => { item.visible = false })

        const value = `${select.value}`
        curModel = assets[value]
        curModel[0].visible = true
        curModel[1].visible = true

        const effectController = { step: 1 }
        gui = new GUI()
        gui.add(effectController, 'step', 1, models.length, 1).onChange(() => {
            const textTag = document.getElementById('modelNum')
            textTag.innerText = `iter #${models[effectController.step - 1].toString()}`
            curModel.forEach((item, index) => {
                if (index == 0) return
                if (index == effectController.step) { item.visible = true }
                else item.visible = false
            })
        })
    }

    changeModel()
    const button = document.getElementById('model-button')
    button.addEventListener('click', changeModel)

    const render = () => {
        const timer = Date.now() * 0.0005
        camera.position.x = Math.cos(timer) * 3
        camera.position.z = Math.sin(timer) * 3
        camera.lookAt(cameraTarget)
        renderer.render(scene, camera)
    }

    const animate = () => {
        requestAnimationFrame(animate)
        render()
    }
    return animate
}

loadAssets(names).then(async assets => {
    // console.log(assets)
    const animate = await init(assets)
    animate()
})