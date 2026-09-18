import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import axios from "axios";
import { riderService } from "../main";
import type { IOrder } from "../types";

declare module "leaflet" {
    namespace Routing {
        function control(options: any): any;
        function osrmv1(option?: any): any;
    }
}

const riderIcon = new L.DivIcon({
    html: "🛵",
    iconSize: [30, 30],
    className: "",
});

const deliveryIcon = new L.DivIcon({
    html: "🏠",
    iconSize: [30, 30],
    className: "",
});

interface Props {
    order: IOrder,
}

const Routing = ({
    from,
    to,
}: {
    from: [number, number],
    to: [number, number],
}) => {
    const map = useMap();
    useEffect(() => {
        const control = L.Routing.control({
            waypoints: [L.latLng(from), L.latLng(to)],
            lineOptions: {
                styles: [{ color: "#E23744", weight: 5 }],
            },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
            createMarker: () => null,
            router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1",
            })
        }).addTo(map);

        return () => { map.removeControl(control) };
    }, [from, to, map]);
    return null;
};

const RiderOrderMap = ({ order }: Props) => {
    const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

    const { latitude: deliveryLat, longitude: deliveryLng } = order.deliveryAddress;

    useEffect(() => {
        const fetchLocation = () => {
            navigator.geolocation.getCurrentPosition((pos) => {
                const latitude = pos.coords.latitude;
                const longitude = pos.coords.longitude;

                setRiderLocation([latitude, longitude]);

                // The rider service authenticates the request and derives the
                // customer's room from the order this rider is carrying. The
                // browser never holds the internal service key, so it cannot
                // target an arbitrary room.
                axios.post(`${riderService}/api/rider/location`, {
                    latitude,
                    longitude,
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }).catch((err) => console.log("Failed to share location:", err));
            }, (err) => console.log("Location Error:", err), {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            });
        }
        fetchLocation();

        const interval = setInterval(fetchLocation, 10000);

        return () => clearInterval(interval);
    }, []);

    // Guards belong after the hooks - returning earlier would change the number
    // of hooks between renders once coordinates arrive.
    if (deliveryLat == null || deliveryLng == null) return null;
    if (!riderLocation) return null;

    const deliveryLocation: [number, number] = [deliveryLat, deliveryLng];

    return <div className="rounded-xl bg-white shadow-sm p-3">
        <MapContainer center={riderLocation} zoom={14} className="h-87.5 w-full rounded-lg">
            <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={riderLocation} icon={riderIcon}>
                <Popup>
                    You (Rider)
                </Popup>
            </Marker>
            <Marker position={deliveryLocation} icon={deliveryIcon}>
                <Popup>
                    Delivery Location
                </Popup>
            </Marker>
            <Routing from={riderLocation} to={deliveryLocation} />
        </MapContainer>
    </div>
}

export default RiderOrderMap;
