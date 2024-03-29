    var websocket = null;
    var pluginUUID = null;
    var settingsCache = {};

    //var DestinationEnum = Object.freeze({ "HARDWARE_AND_SOFTWARE": 0, "HARDWARE_ONLY": 1, "SOFTWARE_ONLY": 2 })

    function timerObj () {
        var currentState = 0;
        var countdownTimer = 0;
        var alarm = false;
        var keyPressCounter = 0;
        var keyTimer = 0;

    this.toggleTimer = function (ca,context) {
        //var increment = settings['increment'];
        //var ca = ca;
        var context = context;
        var self = this;
        var thisTimer = 0;
        var titleFlash = false;
        var alarmPlayed = false;
        console.log("toggleTimer "+this.currentState);
        if (this.currentState == 0){
            console.log('setInterval '+this.countdownTimer);
            this.currentState = 1;
            if (this.thisTimer) {
                clearInterval(this.thisTimer);
                this.thisTimer = null;
            }
            this.thisTimer = setInterval(() => {
                //console.log(self.countdownTimer);
                if (self.countdownTimer <= 0) {
                	//console.log('timerLoop hit zero');
                	self.alarm = true;
                }
                else {
                	self.countdownTimer = self.countdownTimer - 1;
                }
                //console.log('timerLoop - ' + self.countdownTimer);
                if (self.alarm == true) {
                	if (alarmPlayed == false || ca.myAlarm.ended == true) {
                		//console.log('play alarm sound');
                		ca.myAlarm.play();
                		alarmPlayed = true;
                	}
                	if (titleFlash == true) {
                		titleFlash = false;
                		ca.SetTitle(context, "");
                	}
                	else {
                		titleFlash = true;
                		ca.SetTitle(context, formatTime(self.countdownTimer));
                	}
                }
                else {
                	ca.SetTitle(context, formatTime(self.countdownTimer));
                }

        }, 1000);
        }
        else {
            console.log('clearInterval '+this.countdownTimer);
            clearInterval(this.thisTimer);
            //console.log('Interval Cleared - '+this.thisTimer);
            this.thisTimer = null;
            thisTimer = null;
            this.currentState = 0;
        }
    }
    }

    var countdownAction = {
        
        type: "com.baptiewright.countdown.action",
        cache: {},

        onKeyDown: function (context, settings, coordinates, userDesiredState) {
            //console.log(context);
        },

        onKeyUp: function (context, settings, coordinates, userDesiredState) {

            var increment = this.GetSetting(settings,'increment',300);
            var myTimer = this.cache['timer',context];
            var self = this;
            if (myTimer.alarm == true)
            {
                console.log("Alarm Canceled");
                this.myAlarm.pause();
                myTimer.alarm = false;
                myTimer.countdownTimer = increment;
                myTimer.keyPressCounter = 0;
                //this.myTimer = this.myTimer.toggleTimer(this.Mytimer);
                this.SetTitle(context, formatTime(myTimer.countdownTimer));
                myTimer.toggleTimer(self,context);
                myTimer.keyTimer = 0;
            }
            else {
                if (((Date.now() - myTimer.keyTimer) < 1500) && myTimer.currentState == 0) {
                    console.log("button pressed in < 1.5 seconds ");
                    if (myTimer.countdownTimer < (myTimer.keyPressCounter * increment))
                    {
                         myTimer.countdownTimer = (myTimer.keyPressCounter * increment);
                         console.log("reset timer "+myTimer.countdownTimer);
                         //this.keyPressCounter = 1;
                     }
                     else {
                        myTimer.keyPressCounter++;
                        myTimer.countdownTimer = (myTimer.keyPressCounter * increment);
                        console.log("increase timer "+myTimer.countdownTimer);
                    }
                    if (myTimer.countdownTimer > 3601){
                        myTimer.countdownTimer = increment;
                        myTimer.keyPressCounter = 1;
                        console.log("cycle timer "+myTimer.countdownTimer);
                    }
                    myTimer.currentState = 0;
                    this.SetTitle(context, formatTime(myTimer.countdownTimer));
                    
                }
                else {
                    myTimer.toggleTimer(self,context);
                }
            }
            myTimer.keyTimer = Date.now();
            currentState = myTimer.currentState;
            //console.log("State - "+currentState);
            updatedState = {};
            updatedState["state"] = currentState;
            this.SetState(context, updatedState);
            this.cache['timer',context] = myTimer;
        },

        onWillAppear: function (context, settings, coordinates) {
            var increment = this.GetSetting(settings,'increment',300);
            var self = this;
            this.myAlarm = new Audio('alarm.mp3');
            if (typeof this.cache['timer',context] === 'undefined')
            {
                var myTimer = new timerObj(context,self);
                myTimer.currentState = 0;
                myTimer.countdownTimer = increment;
                myTimer.keyPressCounter = 0;
                myTimer.alarm = false;
                myTimer.keyTimer = 0;
                this.cache['timer',context] = myTimer;
                console.log("First Run "+context);
            }
            else {
                myTimer = this.cache['timer',context];
                console.log("Not First Run "+myTimer.countdownTimer);
            }

            this.SetTitle(context, formatTime(myTimer.countdownTimer));
        },

        onWillDisappear: function (context, settings, coordinates) {
            myTimer = null;
            //this.ToggleTimer(context, settings, coordinates);
        },

        GetSetting: function (settings, variable, defaultvalue) {
            if (settings != null && settings.hasOwnProperty(variable)) {
                //console.log("Got Variable "+variable+" "+settings[variable]);
                return settings[variable];
            }
            else {
                //console.log("Returned Default Variable "+variable+" "+defaultvalue);
                return defaultvalue;
            }
        },

        SetTitle: function (context, keyPressCounter) {
            var json = {
                "event": "setTitle",
                "context": context,
                "payload": {
                    "title": "" + keyPressCounter,
                    "target": DestinationEnum.HARDWARE_AND_SOFTWARE
                }
            };

            websocket.send(JSON.stringify(json));
        },

        SetTitleParams: function (context, settings) {
            var json = {
                "event": "titleParametersDidChange",
                "context": context,
                "payload": {
                    "settings": settings
                }
            };

            websocket.send(JSON.stringify(json));
        },

        SetSettings: function (context, settings) {
            var json = {
                "event": "setSettings",
                "context": context,
                "payload": settings
            };
            console.log(json);
            websocket.send(JSON.stringify(json));
        },

        SetState: function (context, settings) {
            var json = {
                "event": "setState",
                "context": context,
                "payload": settings
            };

            websocket.send(JSON.stringify(json));
        },

        AddToSettings: function (context, newSettings) {
            settingsCache[context]
        },
    };

    
    function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
        pluginUUID = inPluginUUID

        // Open the web socket
        websocket = new WebSocket("ws://127.0.0.1:" + inPort);

        function registerPlugin(inPluginUUID) {
            var json = {
                "event": inRegisterEvent,
                "uuid": inPluginUUID
            };

            websocket.send(JSON.stringify(json));
        };

        websocket.onopen = function () {
            // WebSocket is connected, send message
            registerPlugin(pluginUUID);
        };

        websocket.onmessage = function (evt) {
            // Received message from Stream Deck
            var jsonObj = JSON.parse(evt.data);
            var event = jsonObj['event'];
            var action = jsonObj['action'];
            var context = jsonObj['context'];
            var jsonPayload = jsonObj['payload'] || {};
            //console.log(evt);
            if (event == "keyDown") {
                var settings = jsonPayload['settings'];
                var coordinates = jsonPayload['coordinates'];
                var userDesiredState = jsonPayload['userDesiredState'];
                countdownAction.onKeyDown(context, settings, coordinates, userDesiredState);
            }
            else if (event == "keyUp") {
                var settings = jsonPayload['settings'];
                var coordinates = jsonPayload['coordinates'];
                var userDesiredState = jsonPayload['userDesiredState'];
                countdownAction.onKeyUp(context, settings, coordinates, userDesiredState);
            }
            else if (event == "willAppear") {
                console.log("Appearing");
                var settings = jsonPayload['settings'];
                var coordinates = jsonPayload['coordinates'];
                countdownAction.onWillAppear(context, settings, coordinates);
            }
            else if (event == "willDisappear") {
                console.log("Disappearing");
                var settings = jsonPayload['settings'];
                var coordinates = jsonPayload['coordinates'];
                countdownAction.onWillDisappear(context, settings, coordinates);
            }
            else if (event == "sendToPlugin") {
                if (jsonPayload.hasOwnProperty('pidisplayed')){
                    console.log('PI has appeared!');
                    var json = {
                        "event": "sendToPropertyInspector",
                        "uuid": inPluginUUID,
                        "increment": countdownAction.increment
                    };
                    websocket.send(JSON.stringify(json));
                }

                if (jsonPayload.hasOwnProperty('increment')) {

                    var newValue = jsonPayload.increment;
                    console.log("sendToPlugin "+newValue);
                    countdownAction.SetSettings(context, { "increment": newValue });
                    countdownAction.SetTitle(context, newValue.toString().toMMSS());
                    myTimer = countdownAction.cache['timer',context];
                    myTimer.countdownTimer = newValue;
                    myTimer.keyPressCounter = 0;
                    countdownAction.cache['timer',context] = myTimer;
                }

                if (jsonPayload.hasOwnProperty('background-image')) {

                    const imageName = jsonPayload['background-image'];

                    loadImageAsDataUri(`${imageName}`, function (imgUrl) {
                        var json = {
                            "event": "setImage",
                            "context": context,
                            "payload": {
                                image: imgUrl || "",
                                target: DestinationEnum.HARDWARE_AND_SOFTWARE
                            }
                        };
                        websocket.send(JSON.stringify(json));
                    })

                }
            }
        };

        websocket.onclose = function () {
            // Websocket is closed
        };
    };


    function loadImageAsDataUri(url, callback) {
        var image = new Image();

        image.onload = function () {
            var canvas = document.createElement("canvas");

            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(this, 0, 0);
            callback(canvas.toDataURL("image/png"));
        };

        image.src = url;
    };		

    function formatTime(insecs){
        var outputTime;
        outputTime = (insecs).toString();
        outputTime = outputTime.toMMSS();
        return outputTime;
    }

    String.prototype.toMMSS = function () {
var sec_num = parseInt(this, 10); // don't forget the second param
var hours   = Math.floor(sec_num / 3600);
var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
var seconds = sec_num - (hours * 3600) - (minutes * 60);
if ((hours == 1) && (minutes == 0))
{
    minutes = 60;
}
if (hours   < 10) {hours   = "0"+hours;}
if (minutes < 10) {minutes = "0"+minutes;}
if (seconds < 10) {seconds = "0"+seconds;}
return minutes+':'+seconds;
}