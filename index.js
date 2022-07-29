// Initialize and add the map
let map;
let geocoder;
let searchBox;
let myCoords;
let mapCoords;
let distance;
let direction;

let loadedUrlLocation = false;
let oldMarker;

/* Log Console to HTML
(function () {
    var old = console.log;
    var logger = document.getElementById('log');
    console.log = function (message) {
        if (typeof message == 'object') {
            logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : message) + '<br />';
        } else {
            logger.innerHTML += message + '<br />';
        }
    }
})(); */

function initMap() {
    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: { lat: 51.4730854, lng: 7.4495769 },
            zoom: 9,
            mapTypeId: "roadmap",
            disableDefaultUI: true
        }
    );

    geocoder = new google.maps.Geocoder();

    // Create the search box and link it to the UI element.
    const input = document.getElementById("pac-input");
    searchBox = new google.maps.places.SearchBox(input);

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    
    let markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // Clear out the old markers.
        markers.forEach((marker) => {
            marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }

            // Create a marker for each place.
            markers.push(
                new google.maps.Marker({
                    map,
                    title: place.name,
                    position: place.geometry.location,
                })
            );

            mapCoords = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            }
            updateText();

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    map.addListener("click", (mapsMouseEvent) => {
        mapCoords = {
            lat: mapsMouseEvent.latLng.lat(),
            lng: mapsMouseEvent.latLng.lng()
        }
        markers.forEach((marker) => {
            marker.setMap(null);
        });
        markers = [];
        markers.push(
            new google.maps.Marker({
                map,
                title: "",
                position: mapsMouseEvent.latLng,
            })
        );
        updateText();
    });

    let urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has("lat") && urlParams.has("lng")) {
        let urlLat = parseFloat(urlParams.get("lat"));
        let urlLng = parseFloat(urlParams.get("lng"));
        console.log(urlLat, urlLng);
        if(urlLat < -90 || urlLat > 90 || urlLng < -180 || urlLng > 180) {
            alert("Could not load location from URL!");
        } else {
            mapCoords = {
                lat: urlLat,
                lng: urlLng
            }
            markers.forEach((marker) => {
                marker.setMap(null);
            });
            markers = [];
            oldMarker.setMap(null);
            markers.push(
                oldMarker = new google.maps.Marker({
                    map,
                    title: "",
                    position: {
                        lat: urlLat,
                        lng: urlLng
                    },
                })
            );
            loadedUrlLocation = true;
        }
    }
}

function codeAddress(address) {
    geocoder.geocode({ 'address': address }, function (results, status) {
        if (status == 'OK') {
            console.log(results[0].geometry.location.lat());
            console.log(results[0].geometry.location.lng());
            map.setCenter(results[0].geometry.location);
            var marker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location
            });
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            let pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            }
            myCoords = {
                lat: pos.lat,
                lng: pos.lng
            }

            if (myCoords.lat) {
                new google.maps.Marker({
                    map,
                    title: "My Position",
                    position: myCoords,
                })
            }
            document.getElementById("myCoords").textContent = "Lat: " + pos.lat + " Lng: " + pos.lng;
            if(loadedUrlLocation) {
                updateText();
                loadedUrlLocation = false;
            }
            return pos;
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
        return null;
    }
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}
function calculateBearing(lat1, lon1, lat2, lon2) {
    let φ1 = lat1 * Math.PI / 180;
    let λ1 = lon1 * Math.PI / 180;
    let φ2 = lat2 * Math.PI / 180;
    let λ2 = lon2 * Math.PI / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    const brng = (θ * 180 / Math.PI + 360) % 360; // in degrees
    return brng;
}
function updateText() {
    document.getElementById("distanceHeader").textContent = "Distance";
    document.getElementById("mapCoords").innerHTML = "Lat: " + mapCoords.lat + " Lng: " + mapCoords.lng;
    distance = calculateDistance(myCoords.lat, myCoords.lng, mapCoords.lat, mapCoords.lng);
    direction = calculateBearing(myCoords.lat, myCoords.lng, mapCoords.lat, mapCoords.lng);
    document.getElementById("distance").textContent = (Math.round(distance) / 1000) + "km";
    document.getElementById("direction").textContent = (Math.round(direction * 100) / 100) + "°";
}


initMap();
getLocation();

if (window.DeviceMotionEvent == undefined) {
    console.log("no accelerometer");
    alert("no accelerometer")
} else {
    console.log("accelerometer found");
    window.addEventListener("deviceorientationabsolute", (e) => {
        let aX = Math.abs(e.alpha - 360);
        document.getElementById("compass").style.transform = `rotate(${((-aX + direction) - 90)}deg)`;
    }, true);
}

let interval = setInterval(() => {
    if(myCoords && mapCoords && myCoords.lat && mapCoords.lat) {
        getLocation();
        distance = calculateDistance(myCoords.lat, myCoords.lng, mapCoords.lat, mapCoords.lng);
        direction = calculateBearing(myCoords.lat, myCoords.lng, mapCoords.lat, mapCoords.lng);
        document.getElementById("distance").textContent = (Math.round(distance) / 1000) + "km";
        document.getElementById("direction").textContent = (Math.round(direction * 100) / 100) + "°";
    }
}, 1000);

let mapButton = document.getElementById("mapButton");
mapButton.onclick = () => {
    if(document.getElementById("map").style.display == "none") {
        document.getElementById("map").style.display = "";
        document.getElementById("pac-input").style.display = "";
        mapButton.textContent = "Hide Map";
    } else {
        document.getElementById("map").style.display = "none";
        document.getElementById("pac-input").style.display = "none";
        mapButton.textContent = "Show Map";
    }
}

let infoButton = document.getElementById("infoButton");
infoButton.onclick = () => {
    if(document.getElementById("info").style.display == "none") {
        document.getElementById("info").style.display = "";
        infoButton.textContent = "Hide Info";
    } else {
        document.getElementById("info").style.display = "none";
        infoButton.textContent = "Show Info";
    }
}

document.getElementById("shareButton").onclick = () => {
    if(mapCoords && mapCoords.lat) {
        const shareData = {
            title: 'Alex Cool Compass Location',
            url: window.location.href.split("?")[0] + `?lat=${mapCoords.lat}&lng=${mapCoords.lng}`
          }
        navigator.share(shareData);
    } else {
        alert("Choose a location before sharing!");
    }
}