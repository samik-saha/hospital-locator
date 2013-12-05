// For an introduction to the Navigation template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232506
(function () {
    "use strict";
    var applicationData = Windows.Storage.ApplicationData.current;
    var localSettings = applicationData.localSettings;
    var localFolder = applicationData.localFolder;
    
    var notifications = Windows.UI.Notifications;

    var activation = Windows.ApplicationModel.Activation;
    var app = WinJS.Application;
    var nav = WinJS.Navigation;
    var sched = WinJS.Utilities.Scheduler;
    var ui = WinJS.UI;




    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            nav.history = app.sessionState.history || {};
            nav.history.current.initialPlaceholder = true;

            // Optimize the load of the application and while the splash screen is shown, execute high priority scheduled work.
            ui.disableAnimations();
            var p = ui.processAll().then(function () {
                if (localSettings.values["userAddress"]) {
                    return nav.navigate("/pages/home/home.html", nav.state);
                } else {
                    return nav.navigate(nav.location || Application.navigator.home, nav.state);
                }
                
            }).then(function () {
                return sched.requestDrain(sched.Priority.aboveNormal + 1);
            }).then(function () {
                ui.enableAnimations();
            }).then(function () {

                //document.getElementById("cmd").addEventListener(
                //"click",
                //function () {
                //    console.log(WinJS.Navigation.location);
                //    if (WinJS.Navigation.location != "/pages/UserLocation/UserLocation.html") {
                //        WinJS.Navigation.navigate("/pages/UserLocation/UserLocation.html")
                //    }
                //},
                //false);
            });

            args.setPromise(p);


            WinJS.Application.onerror = function () {
                console.log("an error occurred");
                WinJS.Navigation.navigate("/pages/home/home.html");
                return true;
            }

            window.onerror = function () {
                console.log("an error occurred");
                WinJS.Navigation.navigate("/pages/home/home.html");
                return true;
            }


            notifications.TileUpdateManager.createTileUpdaterForApplication().enableNotificationQueue(true);

            var template = notifications.TileTemplateType.tileWide310x150ImageAndText01;
            var tileXml = notifications.TileUpdateManager.getTemplateContent(template);

            var tileTextAttributes = tileXml.getElementsByTagName("text");
            tileTextAttributes[0].appendChild(tileXml.createTextNode("Hospital Locator"));

            var tileImageAttributes = tileXml.getElementsByTagName("image");

            tileImageAttributes[0].setAttribute("src", "ms-appx:///images/wideDefaultTile.png");
            tileImageAttributes[0].setAttribute("alt", "red graphic");

            var squareTemplate = notifications.TileTemplateType.tileSquare150x150Text04;
            var squareTileXml = notifications.TileUpdateManager.getTemplateContent(squareTemplate);
            var squareTileTextAttributes = squareTileXml.getElementsByTagName("text");
            squareTileTextAttributes[0].appendChild(squareTileXml.createTextNode("Hospital Locator"));

            var node = tileXml.importNode(squareTileXml.getElementsByTagName("binding").item(0), true);
            tileXml.getElementsByTagName("visual").item(0).appendChild(node);

            var tileNotification = new notifications.TileNotification(tileXml);
            tileNotification.tag = "defaultTile"

            notifications.TileUpdateManager.createTileUpdaterForApplication().update(tileNotification);
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
    };

    app.start();
})();
