(function () {
    "use strict";
    var applicationData = Windows.Storage.ApplicationData.current;
    var localSettings = applicationData.localSettings;
    var hospitalReference = null;
    var resultObj = null;
    var latitude = null;
    var longitude = null;
    var currentHospitalName = null;

    var imageArray = [];
    var imageList = null;
    
    window.onerror = function () {
        console.log("an error occurred");
        return true;
    }
    addEventListener("message", processMessage);

    WinJS.UI.Pages.define("/pages/HospitalDetail/HospitalDetail.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            

            hospitalReference = localSettings.values["currentHospitalReference"];
            latitude = localSettings.values["currentHospitalLatitude"];
            longitude = localSettings.values["currentHospitalLongitude"];
            currentHospitalName = localSettings.values["currentHospitalName"];

           // var hospitalDetail = [ hospitalName: currentHospitalName ];
            console.log("HospitalDetail.js: currentHospitalName = " + currentHospitalName);

            element.querySelector("#pageTitle").innerHTML = currentHospitalName;

            WinJS.Utilities.query("a").listen("click", linkClickEventHandler, false);
            
            getHospitalDetails(hospitalReference);

        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in layout.
        }
    });

    function linkClickEventHandler(eventInfo) {
        eventInfo.preventDefault();
        if (website.innerHTML != "(Not available)") {
            var url = new Windows.Foundation.Uri(website.innerHTML);
            Windows.System.Launcher.launchUriAsync(url);
        }
        

    }

    function processMessage(msg) {
        var call = JSON.parse(msg.data);
        var userLat = localSettings.values["latitude"];
        var userLng = localSettings.values["longitude"];
        if (call.event == "mapPageReady") {
            //callFrameScript(document.frames["map1"], "addMarker", [latitude, longitude]);
            callFrameScript(document.frames["map1"], "calcRoute", [userLat, userLng, latitude, longitude]);
            
        } else if (call.event = "calcRouteCompleted") {
            try{
                document.querySelector("#backButton").style.visibility = "visible";
            }
            catch (e) {
                console.log(e.message);
            }
            
        }
        
    }

    function getHospitalDetails(hospitalReference) {
        var placeDetailsURL = "https://maps.googleapis.com/maps/api/place/details/json?reference=" +
            hospitalReference + "&sensor=false&key=AIzaSyAza9o3JpYT8RpYKrPlOtqmn80sHbKBPC8"

        console.log(placeDetailsURL);

        WinJS.xhr({ url: placeDetailsURL, responseType: "json" }).then(
            function (result) {
                if (result.status === 200) {
                    var jsonData = result.responseText;
                    resultObj = eval("(" + jsonData + ")");

                    if (resultObj.status == "OK") {
                        hdProgress.style.visibility = "hidden";
                        hdPage.style.visibility = "visible";

                        pageTitle.innerHTML = resultObj.result.name;
                        if (resultObj.result.international_phone_number) {
                            phNo.innerHTML = resultObj.result.international_phone_number;
                        }
                        if (resultObj.result.website) {
                            website.innerHTML = resultObj.result.website;
                            website.href = "resultObj.result.website";
                        }
                        if (resultObj.result.formatted_address) {
                            address.innerHTML = resultObj.result.formatted_address;
                        }

                        var ratingControl = ratingControlDiv.winControl
                        ratingControl.userRating = resultObj.result.rating;



                        if (resultObj.result.reviews) {
                            reviewItems.innerHTML=""
                            for (i = 0; i < resultObj.result.reviews.length; i++) {
                                var reviewContainer = document.createElement("div");
                                reviewContainer.className = "review-item";

                                var authorElement = document.createElement("h3");
                                authorElement.innerText = resultObj.result.reviews[i].author_name;

                                var ratingLabel = document.createElement("span");
                                ratingLabel.innerText = "Rating:";

                                var ratingHost = document.createElement("div");
                                ratingHost.className = "review-rating";

                                var reviewText = document.createElement("div");
                                reviewText.innerHTML = resultObj.result.reviews[i].text;

                                reviewContainer.appendChild(authorElement);
                                reviewContainer.appendChild(ratingLabel);
                                reviewContainer.appendChild(ratingHost);
                                reviewContainer.appendChild(reviewText);

                                reviewItems.appendChild(reviewContainer);

                                var rat = new WinJS.UI.Rating(ratingHost);
                                rat.disabled = true;
                                rat.userRating = resultObj.result.reviews[i].rating;
                            }
                            var actualWidth = reviewItems.scrollWidth;
                            reviewItems.style.width = actualWidth;
                        }



                        imageArray = [];
                        if (resultObj.result.photos) {
                            for (var i = 0; i < resultObj.result.photos.length; i++) {
                                imageArray.push({ picRef: resultObj.result.photos[i].photo_reference });
                            }
                        }
                        else {
                            imageArray.push({ picRef: null });
                        }
                        imageList = new WinJS.Binding.List(imageArray);
                        imageFlipView.winControl.itemDataSource = imageList.dataSource;
                        imageFlipView.winControl.itemTemplate = MyJSItemTemplate;
                    }

                }
            }
            );

        

    }

    var MyJSItemTemplate = WinJS.Utilities.markSupportedForProcessing(function itemRenderer(itemPromise) {
        // create a basic template for the item that doesn't depend on the data
        var element = document.createElement("div");
        element.className = "image-container";
        element.style.backgroundColor = "lightgray";

        var progressRing = document.createElement("progress");
        progressRing.className = "win-ring win-large";
        element.appendChild(progressRing);

        var imgElement = document.createElement("img");
        imgElement.className = "image";
        imgElement.style.visibility = "hidden";
        imgElement.src = "images/hospital-image.png";
        element.appendChild(imgElement);

        // return the element as the placeholder, and a callback to update it when data is available
        return {
            element: element,

            // specifies a promise that will be completed when rendering is complete
            // itemPromise will complete when the data is available
            renderComplete: itemPromise.then(function (item) {
                var img = element.querySelector("img");
                var imgURI = null;
                if (!item.data.picRef) {
                    imgURI = "images/hospital-image.png";
                } else {
                    imgURI = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference="
                                + item.data.picRef
                                + "&sensor=false&key=AIzaSyAza9o3JpYT8RpYKrPlOtqmn80sHbKBPC8";
                }

                return item.loadImage(imgURI, img).then(function () {
                    // once loaded check if the item is visible
                    return item.isOnScreen();
                });
            }).then(function (onscreen) {
                var img = element.querySelector("img");
                element.style.backgroundColor = "white";
                
                var progressRing = element.querySelector("progress");
                progressRing.style.visibility = "hidden";
                if (!onscreen) {
                    // if the item is not visible, don't animate its opacity
                    img.style.opacity = 1;
                } else {
                    // if the item is visible, animate the opacity of the image
                    WinJS.UI.Animation.fadeIn(img);
                }
                img.style.visibility = "visible";
            })
        };
    });

    //helper method to send message to frame
    function callFrameScript(frame, targetFunction, args) {
        var message = { functionName: targetFunction, args: args };
        try{
            frame.postMessage(JSON.stringify(message), "ms-appx-web://" + document.location.host);
        }
        catch (e) {
            console.log(e.message);
        }
        
    }



})();





