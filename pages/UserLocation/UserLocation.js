// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

(function () {
    "use strict";
    var nav = null;
    var lastPosition = null;
    var applicationData = Windows.Storage.ApplicationData.current;
    var localSettings = applicationData.localSettings;

    var mapLoaded = false;
    var latitude=null, longitude=null, userAddress=null;

    WinJS.UI.Pages.define("/pages/UserLocation/UserLocation.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.
            if (!localSettings.values["userAddress"]) {
                document.getElementById("continueButton").disabled = true;
                requestPosition();
            } else {
                latitude = localSettings.values["latitude"];
                longitude = localSettings.values["longitude"];
                userAddress = localSettings.values["userAddress"];

                document.querySelector("#status").innerText = userAddress;
                if (mapLoaded) {
                    callFrameScript(document.frames["usrLocMap"], "addMarker", [latitude, longitude]);
                }
            }

            addEventListener("message", processMessage);
            element.querySelector("#detectLocationButton").addEventListener("click", requestPosition);
            element.querySelector("#showSearchButton").addEventListener("click", showSearchBox);
            element.querySelector("#cancelSearchButton").addEventListener("click", cancelSearch);
            element.querySelector("#searchButton").addEventListener("click", performSearch);
            element.querySelector("#searchInput").addEventListener("keyup", function (event) {
                var key = event.keyCode || event.which;
                if (key == 13) {
                    performSearch();
                }
            });
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in layout.
        }

   

    });

    function processMessage(msg) {
        var call = JSON.parse(msg.data);
        if (call.event == "mapLoaded") {
            mapLoaded = true;
            latitude = localSettings.values["latitude"];
            longitude = localSettings.values["longitude"];

            if (latitude && longitude) {
                callFrameScript(document.frames["usrLocMap"], "addMarker", [latitude, longitude]);
            }
        }
        else if (call.event == "markerDragged") {
            console.log("marker dragged");
            gReverseGeoCode(call.lat, call.lng);
        }
    }

    //helper method to send message to frame
    function callFrameScript(frame, targetFunction, args) {
        var message = { functionName: targetFunction, args: args };
        console.log(targetFunction);
        try{
            frame.postMessage(JSON.stringify(message), "ms-appx-web://" + document.location.host);
        }
        catch (e) {
            console.log(e.message);
        }
        
    }

    function gGeoCode(address) {
        var url = "http://maps.googleapis.com/maps/api/geocode/json?address=" + address + "&sensor=false";
        WinJS.xhr({
            url: url,
            responseType: "json"
        }).done(
            function onComplete(result) {
                var obj = eval("(" + result.responseText + ")");

                //get latitude and longitude
                var lat = obj.results[0].geometry.location.lat;
                var lng = obj.results[0].geometry.location.lng;

                //display formatted address
                document.getElementById("status").innerHTML = obj.results[0].formatted_address;
                document.querySelector("#searchResult").innerText = obj.results[0].formatted_address;

                //show marker on map
                callFrameScript(document.frames["usrLocMap"], "addMarker", [lat, lng]);
               
                //Save address and lat, lng
                localSettings.values["userAddress"] = obj.results[0].formatted_address;
                localSettings.values["latitude"] = lat;
                localSettings.values["longitude"] = lng;

                //enable continue button
                continueButton.disabled = false;
            },

            function onError(result) {
                document.getElementById("status").innerHTML = "An error occurred."
            }
        );
    }

    function gReverseGeoCode(lat, lng) {
        var url = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&sensor=false";
        WinJS.xhr({
            url: url,
            responseType: "json"
        }).done(
            function onComplete(result) {
                var obj = eval("(" + result.responseText + ")");

                document.getElementById("status").innerHTML = obj.results[0].formatted_address;
                localSettings.values["userAddress"] = obj.results[0].formatted_address;
                if (mapLoaded) {
                    callFrameScript(document.frames["usrLocMap"], "addMarker", [lat, lng]);
                }
            },

            function onError(result){
                document.getElementById("status").innerHTML = "An error occurred."
            }
        );
    }


    function requestPosition() {
        if (nav == null) {
            nav = window.navigator;
        }

        var geoloc = nav.geolocation;
        if (geoloc != null) {
            geoloc.getCurrentPosition(

                function successCallback(position) {
                    try {
                        document.getElementById("continueButton").disabled = false;

                        var lat = position.coords.latitude;
                        var long = position.coords.longitude;

                        console.log(lat + "," + long);

                        lastPosition = { latitude: lat, longitude: long };
                        localSettings.values["latitude"] = lat;
                        localSettings.values["longitude"] = long;

                        //map.setView({ center: new Microsoft.Maps.Location(lat, long), zoom: 12 });
                        //pinLocation(lat, long);

                        gReverseGeoCode(lastPosition.latitude, lastPosition.longitude);
                    }
                    catch (e) {
                        console.log(e);
                    }
                },


                function errorCallback(error) {
                    var strMessage = "";

                    // Check for known errors
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            strMessage = "Access to your location is turned off. " +
                                "Change your settings to turn it back on.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            strMessage = "Data from location services is " +
                                "currently unavailable.";
                            break;
                        case error.TIMEOUT:
                            strMessage = "Location could not be determined " +
                                "within a specified timeout period.";
                            break;
                        default:
                            break;
                    }

                    document.getElementById("status").innerHTML = strMessage;
                });
        }

    }

    function performSearch() {
        var query = document.querySelector("#searchInput").value;
        gGeoCode(query);
    }

    function showSearchBox() {
        btnGroup1.hidden = true;
        searchBox.hidden = false;
        continueButton.disabled = true;
    }

    function cancelSearch() {
        btnGroup1.hidden = false;
        searchBox.hidden = true;
        if (localSettings.values["userAddress"]) {
            continueButton.disabled = false;
        }
    }

})();





