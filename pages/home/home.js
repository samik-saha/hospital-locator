(function () {
    "use strict";
    var applicationData = Windows.Storage.ApplicationData.current;
    var localSettings = applicationData.localSettings;
    var mySessionState = WinJS.Application.sessionState;
    var localFolder = applicationData.localFolder;

    var searchQueryChange = null;
    var searchArgs = null;

    var notifications = Windows.UI.Notifications;
    
    var lat = null, lng=null, userAddress=null;
    var radius = null;

    var filterString = "";

    var dict = { 0.5: 0, 1: 1, 2: 2, 5: 3, 10: 4, 20: 5 };

    var dataArray = [];
    var obj = null;

    var dataList = new WinJS.Binding.List(dataArray);
    var filteredDataList = null;

    var publicMembers =
        {
            itemList: dataList
        };
    WinJS.Namespace.define("DataExample", publicMembers);


    WinJS.UI.Pages.define("/pages/home/home.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {

            /** Add event listeners for the search box **/

            var elem = document.querySelector("#searchBoxId");
            elem.addEventListener("querychanged", searchQueryChanged);
            elem.addEventListener("querysubmitted", searchHandler);

            /** Add event listeners for appbar commands **/

            //Change Location Command
            document.getElementById("changeLocationCmd").addEventListener(
            "click",
            function () {
                console.log(WinJS.Navigation.location);
                if (WinJS.Navigation.location != "/pages/UserLocation/UserLocation.html") {
                    WinJS.Navigation.navigate("/pages/UserLocation/UserLocation.html")
                }
            },
            false);

            //Change Radius Command
            var cmds = document.getElementsByClassName("radiusOption");
            for (var i = 0; i < cmds.length; i++){
                cmds[i].addEventListener("click", searchRadiusChanged);
            }

            /** Retrieve saved user address **/

            lat = localSettings.values["latitude"];
            lng = localSettings.values["longitude"];
            var homeLat = mySessionState.homeLat;
            var homeLong = mySessionState.homeLong;
            
            userAddress = localSettings.values["userAddress"];
            
            /** Retrieve saved search radius **/

            var r = localSettings.values["searchRadius"]

            if (r) {
                radius = r;
                //Set the proper radius option selected
                setSelectedRadius(radius);
            } else {
                //set default radius selected as 5 km.
                radius = 5000;
            }

            element.querySelector("#subheader").innerHTML = "Hospitals within " + radius / 1000 + " km of \"" + userAddress + "\"";

            /** restore searchquery if any **/

            if (mySessionState.filterString) {
                elem.winControl.queryText = mySessionState.filterString;
            }

            listView.winControl.itemTemplate = MyJSItemTemplate;
            listView.winControl.oniteminvoked = itemClicked;

            /** If location has not changed,
            use sessionstate data to populate hospital list **/

            if (homeLat && homeLong) {
                if (lat == homeLat && lng == homeLong) {
                    if (mySessionState.filteredDataList) {
                        filteredDataList = mySessionState.filteredDataList;
                        progressRing.style.visibility = "hidden";
                        listView.winControl.itemDataSource = filteredDataList.dataSource;
                        console.log("Using existing listview data")
                    }
                    else {
                        searchPlaces();
                    }
                }
                else {
                    searchPlaces();
                }
            }
            else {
                mySessionState.homeLat = lat;
                mySessionState.homeLong = lng;
                searchPlaces();
            }
            
        },


    });
    
    /**
    * Set the togglebutton with the radius 'Selected', unselect all other buttons
    */
    function setSelectedRadius(radius) {
        var cmds = document.getElementsByClassName("radiusOption");

        for (var i = 0; i < cmds.length; i++) {
            cmds[i].winControl.selected = false;
        }

        document.getElementById(radius).winControl.selected = true;
    }

    function filter (item) {
            if (item.title.toUpperCase().indexOf(filterString.toUpperCase()) >= 0) {
                return true;
            }
            else {
                return false;
            }
    }

    function searchQueryChanged(args) {
        if (searchQueryChange) {
            clearTimeout(searchQueryChange);
        }
        searchQueryChange = setTimeout(searchHandler, 1000);
        searchArgs = args;
    }

    function searchHandler(args) {
        ///WinJS.Navigation.navigate('/pages/SearchResults/searchResults.html', args.detail);
        if (!args) {
            args = searchArgs;
        }

        if (searchQueryChange) {
            clearTimeout(searchQueryChange);
        }

        filterString = args.detail.queryText;
        mySessionState.filterString = filterString;
        filteredDataList = dataList.createFiltered(filter);

        if (filteredDataList.length > 0) {
            document.getElementById("searchStatus").hidden = true;
            mySessionState.filteredDataList = filteredDataList;
            listView.winControl.itemDataSource = filteredDataList.dataSource;
        } else {
            //make sure progress ring is hidden
            progressRing.hidden = true;

            //make #searchStatus element visible
            document.getElementById("searchStatus").hidden = false;
            searchStatus.innerHTML = "No hospitals found with \""+filterString+"\". Please increase the search radius ot try a different location.";

            //clear out listview
            listView.winControl.itemDataSource = null;
        }
        
    }

    function searchRadiusChanged(e) {
        console.log(e.target);
        radius = e.target.id;
        setSelectedRadius(radius)
        //radius = distRange.options[distRange.selectedIndex].value;
        localSettings.values["searchRadius"] = radius;
        document.querySelector("#subheader").innerHTML = "Hospitals within " + radius / 1000 + " km of \"" + userAddress + "\"";
        progressRing.style.visibility = "visible";
        listView.winControl.itemDataSource = null;
        searchPlaces()
    }

    function searchPlaces() {
        searchStatus.innerHTML = "";
        var searchURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        var searchParams = "?location=" + lat + "," + lng +
                "&radius=" + radius +
                "&types=hospital" +
                "&sensor=false" +
                "&key=AIzaSyAza9o3JpYT8RpYKrPlOtqmn80sHbKBPC8";

        console.log(searchURL + searchParams);

        WinJS.xhr({
            url: searchURL + searchParams,
            responseType: "json"
        }).done(
            function completed(result) {
                if (result.status === 200) {

                    // Get the XML document from the results. 
                    var jsonData = result.responseText;

                    //Convert JSON response to javascript object
                    obj = eval("(" + jsonData + ")");

                    if (obj.status == "OK") {
                        try {
                            
                            //clear previous data items from the array
                            dataArray = [];

                            //read results and add them to the array
                            for (var i = 0; i < obj.results.length; i++) {

                                var imageBlob = "images/hospital-icon.png";
                                var picRef = null;

                                if (obj.results[i].photos) {
                                    picRef = obj.results[i].photos[0].photo_reference
                                }

                                dataArray.push({
                                    ref: obj.results[i].reference,
                                    title: obj.results[i].name,
                                    addr: obj.results[i].vicinity,
                                    picRef: picRef,
                                    latitude: obj.results[i].geometry.location.lat,
                                    longitude: obj.results[i].geometry.location.lng
                                });

                            }

                            //create a datalist with the array
                            dataList = new WinJS.Binding.List(dataArray);

                            //create a filtered data list based on any search terms entered
                            filteredDataList = dataList.createFiltered(filter);

                            //hide progress ring
                            progressRing.style.visibility = "hidden";

                            //hide search status
                            document.getElementById("searchStatus").hidden = true;

                            //assign (or re-assign) item datasource of listview
                            listView.winControl.itemDataSource = filteredDataList.dataSource;

                            //save the filtered datalist to sessionstate, so that it can be retrieved in future
                            mySessionState.filteredDataList = filteredDataList;
                        }
                        catch (e) {
                            console.log(e.message);
                        }

                    } else { //search return other non 'OK' status like '0 Results' etc.

                        //make sure progress ring is hidden
                        progressRing.hidden = true;

                        //make #searchStatus element visible
                        document.getElementById("searchStatus").hidden = false;
                        searchStatus.innerHTML = "No hospitals found. Please increase the search radius ot try a different location.";

                        //clear out listview
                        listView.winControl.itemDataSource = null;
                    }
                }
            },

            function error(r){
                progressRing.style.visibility = "hidden";

                var msg = new Windows.UI.Popups.MessageDialog(
                "An error occurred while retrieving hospital list. Please try later.");

                msg.showAsync();
            }

            );
    }


    var MyJSItemTemplate = WinJS.Utilities.markSupportedForProcessing(function itemRenderer(itemPromise) {
        // create a basic template for the item that doesn't depend on the data
        var element = document.createElement("div")
        element.className = "item-container";

        var imgContainer = document.createElement("div")
        imgContainer.className = "image-container";
        element.appendChild(imgContainer);

        var imgElement = document.createElement("img");
        imgElement.className = "item-image";
        //imgElement.src = "images/hospital-icon.png";
        imgContainer.appendChild(imgElement);

        var textDiv = document.createElement("div");
        textDiv.className = "item-text-container"

        var titleElement = document.createElement("span");
        titleElement.className = "item-title";

        var addrElement = document.createElement("span");
        addrElement.className = "item-text";

        textDiv.appendChild(titleElement);
        textDiv.appendChild(addrElement);
        element.appendChild(textDiv);


        // return the element as the placeholder, and a callback to update it when data is available
        return {
            element: element,

            // specifies a promise that will be completed when rendering is complete
            // itemPromise will complete when the data is available
            renderComplete: itemPromise.then(function (item) {
                element.querySelector(".item-title").innerText = item.data.title;
                element.querySelector(".item-text").innerText = item.data.addr;

                return item.ready;
            }).then(function (item) {
                var img = element.querySelector("img");
                var imgURI = null;
                if (!item.data.picRef) {
                    imgURI = "images/hospital-icon.png";
                } else {
                    imgURI = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=250&photoreference="
                                + item.data.picRef
                                + "&sensor=false&key=AIzaSyAza9o3JpYT8RpYKrPlOtqmn80sHbKBPC8";
                }

                return item.loadImage(imgURI, img).then(function () {
                    // once loaded check if the item is visible
                    return item.isOnScreen();
                });


            }).then(function (onscreen) {
                var img = element.querySelector("img");
                if (!onscreen) {
                    // if the item is not visible, don't animate its opacity
                    img.style.opacity = 1;
                } else {
                    // if the item is visible, animate the opacity of the image
                    WinJS.UI.Animation.fadeIn(img);
                }
            })
        };
    });


    function itemClicked(eventInfo) {
        var itemIndex = eventInfo.detail.itemIndex;
        localSettings.values["currentHospitalReference"] = filteredDataList.getAt(itemIndex).ref;
        localSettings.values["currentHospitalLatitude"] = filteredDataList.getAt(itemIndex).latitude;
        localSettings.values["currentHospitalLongitude"] = filteredDataList.getAt(itemIndex).longitude;
        localSettings.values["currentHospitalName"] = filteredDataList.getAt(itemIndex).title;
        WinJS.Navigation.navigate("pages/HospitalDetail/HospitalDetail.html");


        if (filteredDataList.getAt(itemIndex).picRef) {
            var imgURI = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=250&photoreference="
                + filteredDataList.getAt(itemIndex).picRef
                + "&sensor=false&key=AIzaSyAza9o3JpYT8RpYKrPlOtqmn80sHbKBPC8";
            WinJS.xhr({
                url: imgURI,
                responseType: "blob"
            }).done(
            function (request) {
                var blob = request.response;
                writeBlobToFile(blob);
                console.log("received wide tile");
            });
        }
    }


    function writeBlobToFile(blob) {
        var tileCount = localSettings.values["tilecount"];
        if (!tileCount) {
            tileCount = 1;
        } else {
            tileCount += 1;
        }
        if (tileCount > 5) {
            tileCount = 1;
        }

        localFolder.createFileAsync("wideTile"+tileCount+".png", Windows.Storage.CreationCollisionOption.replaceExisting)
            .then(function (file) {
                file.openAsync(Windows.Storage.FileAccessMode.readWrite).then(function (output) {

                    // Get the IInputStream stream from the blob object 
                    var input = blob.msDetachStream();

                    // Copy the stream from the blob to the File stream 
                    Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output).then(function () {
                        output.flushAsync().done(function () {
                            input.close();
                            output.close();
                            console.log("File '" + file.name + "' saved successfully to the local folder!", "sample", "status");

                            localSettings.values["tilecount"] = tileCount;
                            //Send tile update
                            sendTileUpdate();
                        });
                    });
                });

            }).done(function () {
            });
    }


    function sendTileUpdate() {
        var template = notifications.TileTemplateType.tileWide310x150ImageAndText01;
        var tileXml = notifications.TileUpdateManager.getTemplateContent(template);

        var tileTextAttributes = tileXml.getElementsByTagName("text");
        tileTextAttributes[0].appendChild(tileXml.createTextNode(localSettings.values["currentHospitalName"]));

        var tileImageAttributes = tileXml.getElementsByTagName("image");

        var tileCount = localSettings.values["tilecount"];
        if (!tileCount) {
            tileCount = 1;
        }

        tileImageAttributes[0].setAttribute("src", "ms-appdata:///local/wideTile"+tileCount+".png");
        tileImageAttributes[0].setAttribute("alt", "Hospital Image");

        var squareTemplate = notifications.TileTemplateType.tileSquare150x150PeekImageAndText04;
        var squareTileXml = notifications.TileUpdateManager.getTemplateContent(squareTemplate);
        var squareTileTextAttributes = squareTileXml.getElementsByTagName("text");
        squareTileTextAttributes[0].appendChild(squareTileXml.createTextNode(localSettings.values["currentHospitalName"]));
        var squareTileImageAttributes = squareTileXml.getElementsByTagName("image");
        squareTileImageAttributes[0].setAttribute("src", "ms-appdata:///local/wideTile.png");
        squareTileImageAttributes[0].setAttribute("alt", "Hospital Image");

        var node = tileXml.importNode(squareTileXml.getElementsByTagName("binding").item(0), true);
        tileXml.getElementsByTagName("visual").item(0).appendChild(node);

        var tileNotification = new notifications.TileNotification(tileXml);
        tileNotification.tag = localSettings.values["currentHospitalName"].substring(1, 16);
        notifications.TileUpdateManager.createTileUpdaterForApplication().update(tileNotification);
    }

})();

