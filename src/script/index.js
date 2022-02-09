"use strict";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Reflector } from "three/examples/jsm/objects/Reflector";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import TWEEN from "@tweenjs/tween.js";
export default class ThreeCity {
  constructor() {
    this.INTERSECTED = null;
    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    this.raycasterObjects = [];
    this.composer = null;
    this.outlinePass = null;

    this._clickTimer = 0;
    this._clickTimerFl = null;
  }
  init() {
    this.createScene(false);
    this.createCamera(false);
    this.createRenderer();
    this.setFog();
    this.setControl();
    this.setLight();
    this.bindClickEvents();
    this.makeGround();
    this.loadEvnModel();
  }
  

  createCamera(addHelper = false) {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      20000
    );
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);

    this.camera.layers.disableAll();
    this.camera.layers.toggle(0);

    this.camera.position.x = 0;
    this.camera.position.y = 500;
    this.camera.position.z = 1000;
    this.camera.lookAt(0, 0, 0);
    if (addHelper) {
      const helper = new THREE.CameraHelper(this.camera);
      this.scene.add(helper);
    }
  }
 

  createScene(addHelper = false) {
    this.scene = new THREE.Scene();
    if (addHelper) {
      const axes = new THREE.AxesHelper(1);
      this.scene.add(axes);
    }
  }
 
 
  createRenderer() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio * 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animation.bind(this));
    document.body.appendChild(this.renderer.domElement);

    // 效果处理器 postprocessing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );
    this.outlinePass.edgeStrength = 5;
    this.outlinePass.visibleEdgeColor.set("#ffffff");
    this.composer.addPass(this.outlinePass);

    function onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onWindowResize.bind(this), false);
    document.addEventListener("pointermove", (event) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
  }
 
  setFog() {
    this.scene.fog = new THREE.Fog("#000000", 0, 5000);
  }
 
  setControl() {
    this.controls = new MapControls(this.camera, this.renderer.domElement);
  }
  

  animation(time) {
    if (this.wayAnimation) this.wayAnimation();
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(this.raycasterObjects);
    if (intersects.length > 0) {
      if (this.INTERSECTED != intersects[0].object) {
        this.INTERSECTED = intersects[0].object;
        this.outlinePass.selectedObjects = [intersects[0].object];
      }
    } else {
      if (this.INTERSECTED) {
        this.INTERSECTED = null;
        this.outlinePass.selectedObjects = [];
      }
    }

    TWEEN.update(time);
    this.controls.update();
    this.composer.render();
  }
 
 
  setLight() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    hemiLight.position.set(0, 200, 0);
    hemiLight.layers.enable(0);
    hemiLight.layers.enable(1);
    this.scene.add(hemiLight);
    const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
    this.scene.add(hemiLightHelper);

    const addDirectionLight = (x, y, z, color) => {
      let directionalLight = new THREE.DirectionalLight(color, 1);
      directionalLight.position.x = x;
      directionalLight.position.y = y;
      directionalLight.position.z = z;
      directionalLight.castShadow = true;
      directionalLight.target.position.set(1000, 1000, 1000);
      directionalLight.layers.enable(0);
      directionalLight.layers.enable(1);
      this.scene.add(directionalLight);
      let helper1 = new THREE.DirectionalLightHelper(directionalLight, 50);
      this.scene.add(helper1);
    };
    addDirectionLight(-200, 200, 200, 0xffffff); // 左边

    const pointLight = new THREE.PointLight(0xffffff, 1, 5000);
    pointLight.position.set(-500, 1000, -500);
    pointLight.castShadow = true;
    this.scene.add(pointLight);
  }

  makeGround() {
    const geometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);

    const texture = new THREE.TextureLoader().load("/images/floor.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const ground = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: 0x000000,
      shader: {
        uniforms: {
          color: {
            value: null,
          },

          tDiffuse: {
            value: null,
          },

          textureMatrix: {
            value: null,
          },
        },

        vertexShader: /* glsl */ `
          uniform mat4 textureMatrix;
          varying vec4 vUv;

          #include <common>
          #include <logdepthbuf_pars_vertex>

          void main() {

            vUv = textureMatrix * vec4( position, 1.0 );

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

            #include <logdepthbuf_vertex>

          }`,

        fragmentShader: /* glsl */ `
          uniform vec3 color;
          uniform sampler2D tDiffuse;
          varying vec4 vUv;

          #include <logdepthbuf_pars_fragment>

          float blendOverlay( float base, float blend ) {

            return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

          }

          vec3 blendOverlay( vec3 base, vec3 blend ) {

            return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

          }

          float floorNoise( vec2 x ){
              float sum = 0.0;
              float fd = float(100); 
              #pragma unroll_loop_start
              for(int i = 1; i < 100; ++i)
              { 
                  float pdepth = (fd/float(i));
                  float sx = floor(mod(x.x - pdepth, 2.0)) + floor(mod(x.x + pdepth, 2.0));
                  float sy = floor(mod(x.y - pdepth, 2.0)) + floor(mod(x.y + pdepth, 2.0));
                  sum += sx + sy;
              }
              #pragma unroll_loop_end
              return min((sum/(fd * 2.0)) - 0.5, 1.0);
          }

          void main() {

            #include <logdepthbuf_fragment> 

            vec4 base = texture2DProj( tDiffuse, vUv );
            
            vec3 res = blendOverlay( base.rgb, color );

            gl_FragColor = vec4( res, 1.0 );

          }`,
      },
    });

    ground.layers.set(0);
    ground.position.x = 0;
    ground.position.y = 3;
    ground.position.z = 0;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  

  loadEvnModel() {
    let loader = new GLTFLoader();
    loader.load("/model/gx.gltf", (glb) => {
      let object = glb.scene;
      object.traverse((child) => {
        if (child.name === "Router") {
          let textureLoader = new THREE.TextureLoader();
          let texture = textureLoader.load("/images/t2.jpg");
          // 设置阵列模式为 RepeatWrapping
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          // 设置x方向的偏移(沿着管道路径方向)，y方向默认1
          // 等价texture.repeat= new THREE.Vector2(20,1)
          texture.repeat.x = 1;
          texture.repeat.y = 1;
          let tubeMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            color: "#9cc27e",
          });
          child.material = tubeMaterial;
          this.wayAnimation = () => {
            texture.offset.x -= 0.02;
          };
        } else if (child.name === "Areas") {
          let tubeMaterial = new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: 0.9,
            color: "#0a7321", // 1A5FEA
            wireframe: false,
            shininess: 75,
          });
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = tubeMaterial;
        } else if (child.name === "mainbuilding") {
          let tubeMaterial = new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: 1,
            color: "#000000",
            wireframe: false,
            shininess: 75,
          });
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = tubeMaterial;
          this.raycasterObjects.push(child);
        } else if (child.name === "inside") {
          child.layers.set(1);
        }
      });
      this.scene.add(object);
    });
  }
 
  bindClickEvents() {
    window.addEventListener(
      "mousedown",
      (e) => {
        this.mousePosition = {
          x: e.x,
          y: e.y,
        };
      },
      false
    );
    window.addEventListener(
      "mouseup",
      (e) => {
        let { x, y } = this.mousePosition;
        if (x === e.x && y === e.y) {
          if (e.button === 0) {
            this.click();
          } else if (e.button === 2) {
            this.back();
          }
        }
      },
      false
    );
  }
  click() {
    this._clickTimer++;
    clearTimeout(this._clickTimerFl);
    this._clickTimerFl = setTimeout(() => {
      this._clickTimer = 0;
      this.focusOn();
    }, 300);
    if (this._clickTimer > 1) {
      this._clickTimer = 0;
      clearTimeout(this._clickTimerFl);
      this.toggleInBuilding();
    }
  }
  
  focusOn() {
    const objs = this.outlinePass.selectedObjects;
    if (objs.length) {
      console.log("focusOn:", objs[0]);
      let obj = objs[0];
      let target = { ...this.controls.target };
      let position = { ...this.camera.position };
      let positionTarget = {
        x: obj.position.x + 300,
        y: obj.position.y + 300,
        z: obj.position.z + 500,
      };
      new TWEEN.Tween(target)
        .to({ ...obj.position }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.controls.target = new THREE.Vector3(
            target.x,
            target.y,
            target.z
          );
        })
        .start();
      new TWEEN.Tween(position)
        .to(positionTarget, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.camera.position.x = position.x;
          this.camera.position.y = position.y;
          this.camera.position.z = position.z;
        })
        .start();
    }
  }
  back() {
    const objs = this.outlinePass.selectedObjects;
    if (objs.length === 0) {
      console.log("退后");
      this.camera.layers.disableAll();
      this.camera.layers.toggle(0);
    }
  }
  
  toggleInBuilding() {
    console.log("进入建筑内部");

    const objs = this.outlinePass.selectedObjects;
    if (objs.length) {
      this.camera.layers.disableAll();
      this.camera.layers.toggle(1);
    }
  }
}
