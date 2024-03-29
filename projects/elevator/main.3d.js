import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { GUI } from './lil-gui.module.min.js';
import { FontLoader } from './FontLoader.js';

let camera, scene, renderer;
let max_stages = 30;
var stages_count = 10;
var lift, left_door, right_door, stages = [], lift_do = "stop", doors_do = "closed", doors_closed = true, stage_status = true, lift_logic_state = "WAIT";
var COMPORTs = {};
var ComboBoxCOM;
var loaded_status = false, loading_status = "Loading", loadlabel;



var timer_stay_counter = 0;
var stages_out_calls = [];
var stages_in_calls = [];

var buttons_out_call = [];
var buttons_in_call = [];
var buttons_panel, cancel_out_button, cancel_in_button, close_in_button, open_in_button;
var PanelParams;

init();
loading();

function init() {

	// LOADING

	const manager = new THREE.LoadingManager();
	const loadergltf = new GLTFLoader(manager);

	manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
		loading_status = 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.';
		console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
	
	};
	
	manager.onLoad = function ( ) {
		loaded_status = true;
		console.log( 'Loading complete!');	
	};
	
	
	manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
		loading_status = 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.';
		console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
	
	};
	
	manager.onError = function ( url ) {
		loading_status = 'There was an error loading ' + url;
		console.log( 'There was an error loading ' + url );
	
	};
	

	// INIT

	const container = document.createElement('div');
	document.body.appendChild(container);
	loadlabel = document.getElementById('loadlabel');

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 30);
	camera.position.set(5, 5.1, 10);
	camera.rotation.set(0, 0.5, 0);

	scene = new THREE.Scene();

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
	scene.add(directionalLight);

	

	//TEXT
	const fontloader = new FontLoader();
	fontloader.load( 'OpenSans.facetype.json', function ( font ) {

		const color = 0xefba5d;

		const matDark = new THREE.LineBasicMaterial( {
			color: color,
			side: THREE.DoubleSide
		} );

		const matLite = new THREE.MeshBasicMaterial( {
			color: color,						
			side: THREE.DoubleSide
		} );
		

		// make shape ( N.B. edge view not visible )
		
		for (let i = 1; i <= 30; i++) {	
			const message = 'Этаж '+i;
			const shapes = font.generateShapes( message, 0.5 );
			const geometry = new THREE.ShapeGeometry( shapes );
			geometry.computeBoundingBox();
			const xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
			geometry.translate( xMid, 0, 0 );
			const text = new THREE.Mesh( geometry, matLite );
			text.position.set(3, 5.1 * i, 0);
			scene.add( text );
		}
		
	} ); //end load function
	
	
	
	// model

	loadergltf.load('bot.gltf', function (gltf) {

		var bot = gltf.scene;
		scene.add(bot);


	});

	loadergltf.load('lift.gltf', function (gltf) {

		lift = gltf.scene;
		lift.position.y = 0;
		scene.add(lift);
	});

	// STAGES
	loadergltf.load('stage.gltf', function (gltf) {

		const model = new THREE.Object3D( );
		model.add(gltf.scene);
		for (var i = 1; i < 31; i++) {
			let modelClone = model.clone();	
			modelClone.position.y = 5.1 * i - 5.1;
			stages.push(modelClone);
			scene.add(modelClone);
		}		
	});

	loadergltf.load('right_door.gltf', function (gltf) {

		right_door = gltf.scene;
		scene.add(right_door);
	});

	loadergltf.load('left_door.gltf', function (gltf) {

		left_door = gltf.scene;
		scene.add(left_door);
	});



	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1;
	renderer.outputEncoding = THREE.sRGBEncoding;
	container.appendChild(renderer.domElement);

	const environment = new RoomEnvironment();
	const pmremGenerator = new THREE.PMREMGenerator(renderer);

	scene.environment = pmremGenerator.fromScene(environment).texture;

	window.addEventListener('resize', onWindowResize);


	createPanel();
	createCallPanel();
	updateCallPanel();
}

function createCallPanel() {
	buttons_panel = document.createElement('div');
	buttons_panel.className = "sidenav";
	document.body.appendChild(buttons_panel);
}



function updateCallPanel() {
	// Внешние
	buttons_panel.innerHTML = "<a>Внешние вызовы</a>";
	for (let i = 1; i < stages_count + 1; i++) {
		buttons_out_call[i] = document.createElement('button');
		buttons_out_call[i].className = "disable";
		buttons_out_call[i].innerHTML = i;
		buttons_out_call[i].onclick = function () {
			panelCallOut(i);
			buttons_out_call[i].className = "active";
		}
		buttons_panel.append(buttons_out_call[i]);
	}
	let br = document.createElement('br');
	let br2 = document.createElement('br');
	buttons_panel.append(br);
	buttons_panel.append(br2);
	cancel_out_button = document.createElement('button');
	cancel_out_button.innerHTML = "Отмена";
	cancel_out_button.className = "big-button";
	cancel_out_button.onclick = function () {
		panelCallOutCancel();
		for (let i = 1; i < stages_count + 1; i++) {
			buttons_out_call[i].className = "disable";
		}
	}
	buttons_panel.append(cancel_out_button);

	// Внутренние
	let br3 = document.createElement('br');
	let br4 = document.createElement('br');
	buttons_panel.append(br3);
	buttons_panel.append(br4);
	var label_inpanel = document.createElement('a');
	label_inpanel.innerHTML = "Внутренние вызовы";
	buttons_panel.append(label_inpanel);
	for (let i = 1; i < stages_count + 1; i++) {
		buttons_in_call[i] = document.createElement('button');
		buttons_in_call[i].className = "disable";
		buttons_in_call[i].innerHTML = i;
		buttons_in_call[i].onclick = function () {
			panelCallIn(i);
			buttons_in_call[i].className = "active";
		}
		buttons_panel.append(buttons_in_call[i]);
	}
	let br5 = document.createElement('br');
	let br6 = document.createElement('br');
	buttons_panel.append(br5);
	buttons_panel.append(br6);
	cancel_in_button = document.createElement('button');
	cancel_in_button.innerHTML = "Отмена";
	cancel_in_button.className = "big-button";
	cancel_in_button.onclick = function () {
		panelCallInCancel();
		for (let i = 1; i < stages_count + 1; i++) {
			buttons_in_call[i].className = "disable";
		}
	}
	buttons_panel.append(cancel_in_button);
	open_in_button = document.createElement('button');
	open_in_button.innerHTML = "< >";
	close_in_button = document.createElement('button');
	close_in_button.innerHTML = "> <";
	buttons_panel.append(open_in_button);
	buttons_panel.append(close_in_button);
}



function createPanel() {
	const gui = new GUI();
	gui.title('Конфигуратор лифта');

	PanelParams = {
		'Обновить список COM': function () {
			//alert("Update"); 
			COMPORTs = ['COM54', 'COM2'];
			ComboBoxCOM.destroy()
			ComboBoxCOM = folderCOMPORT.add(PanelParams, 'COM PORT', COMPORTs);
		},
		'Подключиться к COM PORT': function () {
			if (ComboBoxCOM.getValue() != "Выберите COM Port") {
				// Подключение к плате
				eel.connectSerial(ComboBoxCOM.getValue());
			}
			else {
				alert("Error: Выберите COM Port.");
			}

		},
		'Остановить лифт': function () { lift_do = "stop"; },
		'Остановить двери': function () { doors_do = "stop"; },
		'Открыть двери': function () { doors_do = "open"; },
		'Закрыть двери': function () { doors_do = "close"; },
		'Лифт &#8593;': function () { lift_do = "up"; },
		'Лифт &#8595;': function () { lift_do = "down"; },
		'Количество этажей': 10,
		'ElevatorPosition': 1,
		'CAMERA X': 5.1,
		'CAMERA Y': 0,
		'CAMERA Z': 10,
		'COM PORT': "Выберите COM Port"
	};

	const folderCOMPORT = gui.addFolder('COM PORT');

	folderCOMPORT.add(PanelParams, 'Обновить список COM');
	folderCOMPORT.add(PanelParams, 'Подключиться к COM PORT');
	ComboBoxCOM = folderCOMPORT.add(PanelParams, 'COM PORT', COMPORTs);

	const folderCamera = gui.addFolder('Camera');

	folderCamera.add(PanelParams, 'CAMERA X', 0, 10).listen().onChange(function (weight) {
		camera.position.x = weight;
	});;

	folderCamera.add(PanelParams, 'CAMERA Y', -10, 10).listen().onChange(function (weight) {
		camera.position.y = 5.1 + lift.position.y + weight;
	});;

	folderCamera.add(PanelParams, 'CAMERA Z', 0, 10).listen().onChange(function (weight) {
		camera.position.z = weight;
	});;


	const folderElevatorConfig = gui.addFolder('Конфигурация лифта');

	folderElevatorConfig.add(PanelParams, 'Количество этажей', 2, max_stages, 1).listen().onChange(function (weight) {
		;
		stages_count = weight;
		right_door.position.y = 0;
		left_door.position.y = 0;
		camera.position.y -= lift.position.y;
		lift.position.y = 0;
		lift_do = "stop";
		doors_do = "closed";
		left_door.position.x = 0;
		right_door.position.x = 0;
		updateCallPanel();
	});;

	const folderElevator = gui.addFolder('Симуляция лифта');

	folderElevator.add(PanelParams, 'ElevatorPosition', 1, max_stages).listen().disable();


	folderElevator.add(PanelParams, 'Остановить лифт');
	folderElevator.add(PanelParams, 'Лифт &#8593;');
	folderElevator.add(PanelParams, 'Лифт &#8595;');
	folderElevator.add(PanelParams, 'Остановить двери');
	folderElevator.add(PanelParams, 'Открыть двери');
	folderElevator.add(PanelParams, 'Закрыть двери');


	folderCamera.close();
	folderElevator.close();
	folderElevatorConfig.close();
	folderCOMPORT.close();
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function loading() {
	if (loaded_status) {
		requestAnimationFrame(animate);
		loadlabel.remove();		
	}
	else {
		requestAnimationFrame(loading);
	}
	loadlabel.innerHTML = loading_status;
}

function animate() {

	requestAnimationFrame(animate);

	checkStageStatus();


	liftStateLogic();

	doorsDoLogic();
	liftDoLogic();

	render();

}

function getCurrentStage() {
	return Math.round((5.1 + lift.position.y) / 5.1);
}


function getLiftPosition() {
	return (5.1 + lift.position.y) / 5.1;
}

function checkStageStatus() {
	if (Math.abs(Math.round((5.1 + lift.position.y) / 5.1) - ((5.1 + lift.position.y) / 5.1)) < 0.02) {
		stage_status = true;
	}
	else {
		stage_status = false;
	}
}


function liftDoLogic() {
	if (doors_closed) {
		switch (lift_do) {
			case "up":
				if (((5.1 + lift.position.y) / 5.1) < (stages_count + 0.1)) {
					lift.position.y += 0.02;
					right_door.position.y += 0.02;
					left_door.position.y += 0.02;
					camera.position.y += 0.02;
				}
				else {
					lift_do = "stop";
				}
				break;
			case "down":
				if (lift.position.y > -2.5) {
					lift.position.y -= 0.02;
					right_door.position.y -= 0.02;
					left_door.position.y -= 0.02;
					camera.position.y -= 0.02;
				}
				else {
					lift_do = "stop";
				}
				break;
			default:
				break;
		}
	}
	PanelParams.ElevatorPosition = (5.1 + lift.position.y) / 5.1;
}



function doorsDoLogic() {
	if (stage_status) {
		switch (doors_do) {
			case "open":
				if (right_door.position.x > 0.7) {
					doors_do = "opened";
					doors_closed = false;
				}
				else {
					doors_closed = false;
					left_door.position.x -= 0.01;
					right_door.position.x += 0.01;
				}

				break;
			case "close":
				if (right_door.position.x < 0.01) {
					doors_do = "closed";
					doors_closed = true;
				}
				else {
					doors_closed = false;
					left_door.position.x += 0.01;
					right_door.position.x -= 0.01;
				}
				break;

			default:

				break;
		}
	}
}

function liftStateLogic() {
	switch (lift_logic_state) {
		case "WAIT":		
			if (stages_in_calls.length > 0) {								
				if (stages_in_calls[0] >= getCurrentStage()) {
					if (stages_in_calls[0] == getCurrentStage() && stage_status) {
						lift_logic_state = "DO_CURRENT";
						doors_do = "open";
						stageStop(getCurrentStage());
					}
					else {
						if (stages_in_calls[0] < getLiftPosition()) {
							lift_logic_state = "DO_DOWN";
							lift_do = "down";
						}
						else {
							lift_logic_state = "DO_UP";
							lift_do = "up";
						}

					}
				}
				else {
					lift_logic_state = "DO_DOWN";
					lift_do = "down";
				}
			}
			else
			{
				if (stages_out_calls.length > 0) {				
					if (stages_out_calls[0] >= getCurrentStage()) {
						if (stages_out_calls[0] == getCurrentStage() && stage_status) {
							lift_logic_state = "DO_CURRENT";
							doors_do = "open";	
							stageStop(getCurrentStage());						
						}
						else {
							if (stages_out_calls[0] < getLiftPosition()) {
								lift_logic_state = "DO_DOWN";
								lift_do = "down";
							}
							else {
								lift_logic_state = "DO_UP";
								lift_do = "up";
							}
	
						}
					}
					else {
						lift_logic_state = "DO_DOWN";
						lift_do = "down";
					}
				}
			}
			break;
		case "DO_UP":		
			if (stage_status) {
				var stopZero = false;
				stages_in_calls.forEach(function (item, index, array) {					
					if (item == getCurrentStage()) {
						lift_logic_state = "DO_UP_STAGE";						
						lift_do = "stop";
						doors_do = "open";	
						stopZero = true;								
					};
				});
				if (getCurrentStage() == calcMaxStage()) {
					lift_logic_state = "DO_CURRENT";
					doors_do = "open";
					stopZero = true;				
				}
				if (stopZero) {
					stageStop(getCurrentStage());
				}
			}
			break;
		case "DO_UP_STAGE":			
			if (doors_do == "opened") {
				timer_stay_counter++;
			}
			if (timer_stay_counter == 100) {
				doors_do = "close";
				timer_stay_counter = 0;
			}
			if (doors_do == "closed") {
				if (getCurrentStage() == calcMaxStage()) {
					lift_logic_state = "WAIT";
					lift_do = "stop";				
					stageFinish(getCurrentStage());
				}
				else {
					lift_do = "up";
					lift_logic_state = "DO_UP";
					stageFinish(getCurrentStage());					
				}
			}
			break;
		case "DO_DOWN":
			if (stage_status) {
				var zero = true;
				var stopZero = false;
				stages_in_calls.forEach(function (item, index, array) {
					if (item == getCurrentStage()) {
						lift_logic_state = "DO_DOWN_STAGE";						
						lift_do = "stop";
						doors_do = "open";	
						zero = false;
						stopZero = true;								
					};
				});
				if (zero) {
					stages_out_calls.forEach(function (item, index, array) {
						if (item == getCurrentStage()) {
							lift_logic_state = "DO_DOWN_STAGE";						
							lift_do = "stop";
							doors_do = "open";	
							stopZero = true;															
						};
					});
				}
				if (getCurrentStage() == calcMinStage()) {
					lift_logic_state = "DO_CURRENT";
					doors_do = "open";
					lift_do = "stop";
					stopZero = true;				
				}
				if (stopZero) {
					stageStop(getCurrentStage());
				}
			}
			break;
		case "DO_DOWN_STAGE":				
				if (doors_do == "opened") {
					timer_stay_counter++;
				}
				if (timer_stay_counter == 100) {
					doors_do = "close";
					timer_stay_counter = 0;
				}
				if (doors_do == "closed") {			
					lift_do = "down";
					lift_logic_state = "DO_DOWN";
					stageFinish(getCurrentStage());
				}
				break;
		case "DO_CURRENT":			
			if (doors_do == "opened") {
				timer_stay_counter++;
			}
			if (timer_stay_counter == 100) {
				doors_do = "close";
				timer_stay_counter = 0;
			}
			if (doors_do == "closed") {			
				lift_logic_state = "WAIT";
				lift_do = "stop";				
				stageFinish(getCurrentStage());
			}
			break;
		default:
			console.log('liftStateLogic() ERROR: Default case');
	}
}

function panelCallIn(number) {

	var duplicate = false;
	stages_in_calls.forEach(function (item, index, array) {
		if (number == item) {
			duplicate = true;
		};
	});
	if (!duplicate) {
		stages_in_calls.push(number);
	}
	console.log("Вызовы внутри кабины: " + stages_in_calls)
}

function panelCallOut(number) {
	var duplicate = false;
	stages_out_calls.forEach(function (item, index, array) {
		if (number == item) {
			duplicate = true;
		};
	});
	if (!duplicate) {
		stages_out_calls.push(number);
	}
	console.log("Вызовы внешний: " + stages_out_calls)
}

function panelCallOutCancel() {
	console.log('panelCallOutCancel');
	for (let i = 1; i < stages_count+1; i++) { 		
		buttons_out_call[i].className = "disable";
		var myIndex = stages_out_calls.indexOf(i);
		if (myIndex !== -1) {
			stages_out_calls.splice(myIndex, 1);
		}
	}
	lift_logic_state = "WAIT";
	lift_do = "stop";
}

function panelCallInCancel() {
	console.log('panelCallInCancel');
	for (let i = 1; i < stages_count+1; i++) { 		
		buttons_in_call[i].className = "disable";
		var myIndex = stages_in_calls.indexOf(i);
		if (myIndex !== -1) {
			stages_in_calls.splice(myIndex, 1);
		}
	}
	lift_logic_state = "WAIT";
	lift_do = "stop";
}

function calcMaxStage() {
	var maxium = 0;
	stages_out_calls.forEach(function (item, index, array) {
		if (maxium < item) {
			maxium = item;
		};
	});
	stages_in_calls.forEach(function (item, index, array) {
		if (maxium < item) {
			maxium = item;
		};
	});

	return maxium;
}

function calcMinStage() {
	var min = 30;
	stages_out_calls.forEach(function (item, index, array) {
		if (min > item) {
			min = item;
		};
	});
	stages_in_calls.forEach(function (item, index, array) {
		if (min > item) {
			min = item;
		};
	});

	return min;
}

function stageFinish(stage_number) {
	console.log('StageFinish('+stage_number+')')
	buttons_in_call[stage_number].className = "disable";
	buttons_out_call[stage_number].className = "disable";
	var myIndex = stages_in_calls.indexOf(stage_number);
	if (myIndex !== -1) {
		stages_in_calls.splice(myIndex, 1);
	}
	myIndex = stages_out_calls.indexOf(stage_number);
	if (myIndex !== -1) {
		stages_out_calls.splice(myIndex, 1);
	}

}

function stageStop(stage_number) {
	console.log('stageStop('+stage_number+')')
	eel.stageStop(stage_number)
}


function render() {
	renderer.render(scene, camera);
}
