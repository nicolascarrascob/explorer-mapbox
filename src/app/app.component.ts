import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
// import '@watergis/mapbox-gl-export/css/styles.css';
import * as Mapboxgl from 'mapbox-gl';
import * as Turf from 'turf/turf'
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import CompassControl from 'mapbox-gl-controls/lib/compass';
import ZoomControl from 'mapbox-gl-controls/lib/zoom';
import LanguageControl from 'mapbox-gl-controls/lib/language';
import TooltipControl from 'mapbox-gl-controls/lib/tooltip';
import InspectControl from 'mapbox-gl-controls/lib/inspect';
import RulerControl from 'mapbox-gl-controls/lib/ruler';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
// import MapboxExportControl from "@watergis/mapbox-gl-export";
//import MapboxPrintControl from "@watergis/mapbox-gl-print";
import { minesotaJson } from "./jsonData/minesotaJson.js";
import { pointJsonLayer } from "./jsonData/pointJsonLayer.js";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{

  mapa : Mapboxgl.Map;
  draw : MapboxDraw
  calculateArea;
  latlng;
  mapListStyle = ['streets-v11', 'light-v10', 'dark-v10', 'outdoors-v11', 'satellite-v9'];
  mapStyleSelected = 'streets-v11';
  languages = [{id:'es', name:'Español'}, {id:'en', name:'Ingles'}, {id: 'ru', name: 'Ruso'}, {id: 'de', name: 'Aleman'}, {id: 'fr', name: 'Frances'},{id: 'ja', name: 'Japones'}, {id:'ko', name: 'Koreano'}];
  languageSelected = {id:'es', name:'Español'}
  layerList;

  ngOnInit(): void {
      Mapboxgl.accessToken = environment.mapboxKey;

      this.mapa = new Mapboxgl.Map({
        container: 'mapa-mapbox', // container id
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-72.7772198,-38.7624939], // starting position
        zoom: 17.25 // starting zoom
      });

      this.draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
          point: true,
          line_string: true
        }
      });
      this.mapa.addControl(this.draw, 'top-right'); 
      this.mapa.on('draw.create', this.calculateLayerArea);
      // this.mapa.on('draw.delete', this.updateArea);
      // this.mapa.on('draw.update', this.updateArea);

      this.mapa.addControl(new CompassControl(), 'top-right');
      this.mapa.addControl(new ZoomControl(), 'top-right');

      this.mapa.addControl(new TooltipControl({ layer: '$fill' }));
      //this.mapa.addControl(new InspectControl(), 'bottom-right');

      this.mapa.addControl(new LanguageControl());
      // with custom language: https://docs.mapbox.com/help/troubleshooting/change-language/
      const languageControl = new LanguageControl({
        language: 'es',
      });
      this.mapa.addControl(languageControl);
      const rule = new RulerControl({
        units: 'kilometers',
        labelFormat: n => `${n.toFixed(2)} km`,
      });
      this.mapa.addControl(rule, 'top-right');
      this.mapa.on('ruler.on', (e:any) => {
        console.log('ruler: on' + e)
      });
      this.mapa.on('ruler.off', () => console.log('ruler: off'));

      //capturar latitud y longitud del mouse
      this.mapa.on('mousemove', this.obtenerLatutudLongitudMouse);
      
      //buscador
      this.mapa.addControl(new MapboxGeocoder({
        accessToken: Mapboxgl.accessToken,
        localGeocoder: this.searchByLatLng,
        mapboxgl: Mapboxgl
        }),'top-left'
      );
      
      //scale control
      this.mapa.addControl(new Mapboxgl.ScaleControl({
          maxWidth: 120,
          unit: 'metric',//'imperial' , 'metric' or 'nautical'
         // position: 'bottom-left'
        }));
      
        this.mapa.addControl(new Mapboxgl.FullscreenControl({container: document.querySelector('body')}));
      //export pdf
      // this.mapa.addControl(new MapboxExportControl(), 'top-right');
      //print
      //this.mapa.addControl(new MapboxPrintControl(), 'top-left');

      //Geolocate control
      this.mapa.addControl(new Mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true
          }
        ));

     this.mapa.on('load', this.loadMapData);
  }

  loadMapData = () => {
    //load data
    this.layerList = new Array();
    //Load layer from object
    this.layerList.push('states-layer');
    this.loadGeoJsonFromObject(minesotaJson, 'states');

    //set style polygon layer
    this.setStylePolygonLayer('states-layer', 'states', 'rgba(249, 249, 3, 0.4)', 'rgba(255, 41, 12, 1)');

    //set popup info layer
    this.popupInfoLayer('states-layer', 'name', 'wikipedia', 'Wikipedia', true);
    
    //set ponter when is over the layer 
    this.mouseEnterLeave('states-layer');

    //LOAD OTHER LAYER 
    this.layerList.push('pointLayers-layer');
    this.loadGeoJsonFromUrl('pointLayers','https://tile-server.dev.geonodosoft.cl/albergues_20200625052159.geojson' );
    
    //set style layer
    this.setStyleCircleLayer('pointLayers-layer', 'pointLayers', '#FBFF0C', '#0C3CFF');

    //set popup info layer
    this.popupInfoLayer('pointLayers-layer', 'ejecutor', 'dispositivo', 'Dispositivo', false);

    //set ponter when is over the layer 
    this.mouseEnterLeave('pointLayers-layer');


    //LOAD SCHOOL LAYER 
    this.layerList.push('schoolLayers-layer');
    this.loadGeoJsonFromUrl('schoolLayers','https://tile-server.dev.geonodosoft.cl/acciona_20200721111409.geojson' );
    
    //set style layer //https://docs.mapbox.com/mapbox-gl-js/example/cluster/
    this.setStyleCircleLayer('schoolLayers-layer', 'schoolLayers', '#29FF0C', '#168C06');

    //set popup info layer
    this.popupInfoLayer('schoolLayers-layer', 'nombre_de_', 'direccion', 'Dirección', false);

    //set ponter when is over the layer 
    this.mouseEnterLeave('schoolLayers-layer');  

    //load image in map
      
    this.loadImageInMapFromUrl();

  }
  setStylePolygonLayer = (nameLayer:string, sourceName:string, fillColor:string, borderColor:string) => {
     this.mapa.addLayer({
          'id': nameLayer,
          'type': 'fill',
          'source': sourceName,
          'paint': {
            'fill-color': fillColor,
            'fill-outline-color': borderColor
          }
      });
  }

  setStyleCircleLayer = (nameLayer:string, nameSource:string, fillColor:string, boderColor:string) => {
     this.mapa.addLayer({
          'id': nameLayer,
          'type': 'circle',
          'source': nameSource,
          'paint': {
            'circle-color': fillColor,
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': boderColor
          }
      });
  }


  loadGeoJsonFromObject = (data:any, nameLayer:string) =>{
    this.mapa.addSource(nameLayer, {
        'type': 'geojson',
        'data': JSON.parse(data)
        //JSON.parse(minesotaJson)
        //https://tile-server.dev.geonodosoft.cl/albergues_20200625052159.geojson
        //https://tile-server.dev.geonodosoft.cl/acciona_20200721111409.geojson
        //https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces_shp.geojson
      });
  }
  loadGeoJsonFromUrl = (nameLayer:string, url:string) => {
    this.mapa.addSource(nameLayer, {
        'type': 'geojson',
        'data': url
      });
  }

  loadImageInMapFromUrl = () => {
    this.mapa.loadImage( 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Official_b.a.t.m.a.n._logo.svg/800px-Official_b.a.t.m.a.n._logo.svg.png',
      this.getImage);
  }
  //https://docs.mapbox.com/mapbox-gl-js/example/add-image/
   getImage = (error:any, img:any) =>{
    if (error) throw error;
      this.mapa.addImage('cat', img);
      this.mapa.addSource('point', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': [{
            'type': 'Feature',
            'geometry': {
            'type': 'Point',
            'coordinates': [-72.7772772798886,  -38.762926716171314]
            }
          }]
        }
      });
      this.mapa.addLayer({
        'id': 'points',
        'type': 'symbol',
        'source': 'point',
        'layout': {
          'icon-image': 'cat',
          'icon-size': 0.2
          }
      });
  }

  popupInfoLayer = (nameLayer : string, firstProperty:string, secondProperty:string, secondLabel:string, url:boolean) =>{
     this.mapa.on('click', nameLayer, (e : any) => {
        const propertiesJson = JSON.stringify(e.features[0].properties);
        const data = JSON.parse(propertiesJson);
          new Mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(this.popupInfoHtml(url, data[firstProperty], data[secondProperty], secondLabel))
          .addTo(this.mapa);
        });
  }
  popupInfoHtml = (url:boolean, data1, data2, lbl2) => {
    if(url){
      return `<b>${data1} </b> <br> ${lbl2} <a href="${data2}" target="_blank">link</a>`;
    }
    return `<b> ${data1} </b> <br> ${lbl2}: ${data2}`;
  }

  mouseEnterLeave = (nameLayer : string) => {
      // Change the cursor to a pointer when the mouse is over the states layer.
      this.mapa.on('mouseenter', nameLayer, () => {
        this.mapa.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves.
      this.mapa.on('mouseleave', nameLayer, () => {
        this.mapa.getCanvas().style.cursor = '';
      });
  }

searchByLatLng = (data:any) => {
  var matches = data.match( /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i);
  console.log(matches)
  if (!matches) {
    return null;
  }
  const coord1 = Number(matches[1]);
  const coord2 = Number(matches[2]);  
  let geocodes = [];

  if (coord1 < -90 || coord1 > 90) {
    // must be lng, lat
    geocodes.push(this.convertCondinateInFeatureObject(coord1, coord2));
  }
 
  if (coord2 < -90 || coord2 > 90) {
    // must be lat, lng
    geocodes.push(this.convertCondinateInFeatureObject(coord2, coord1));
  }
 
  if (geocodes.length === 0) {
    // else could be either lng, lat or lat, lng
    //geocodes.push(this.convertCondinateInFeatureObject(coord1, coord2));
    geocodes.push(this.convertCondinateInFeatureObject(coord2, coord1));
  }
 
  return geocodes;
}

convertCondinateInFeatureObject = (lng: Number, lat : Number) => {
  const features = {
        center: [lng, lat],
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        place_name: 'Lat: ' + lat + ' Lng: ' + lng,
        place_type: ['coordinate'],
        properties: {},
        type: 'Feature'
  };
  return features;
}

obtenerLatutudLongitudMouse = (data:any) => {
  this.latlng = 'Latitud: '+ data.lngLat.lat + '  Longitud: '+data.lngLat.lng ;
}

 calculateLayerArea =  (data:any) => {
        if (data.features.length > 0) {
          const features = data.features[0];
          if(features.geometry.type === 'Polygon'){
            const area = Turf.area(features);
            // restrict to area to 2 decimal points
            const rounded_area = Math.round(area * 100) / 100;
            this.calculateArea = ` <p>Área del poligono.</p><p><strong> ${rounded_area} </strong> metros cuadrados</p>`;
          } else if(features.geometry.type === 'Point'){
            this.calculateArea = `Coordenadas del punto: <br/>
                                  <strong>Latitud: ${features.geometry.coordinates[0]} </strong> 
                                  <br/><strong>Longitud: ${features.geometry.coordinates[1]}`;
          }else if (features.geometry.type === "LineString"){
            // const line = Turf.lineString(data.features[0].geometry.coordinates);
            // const options = {units: 'miles'};
            // const along = Turf.length(line, options);
            // this.calculateArea = ' <p>Largo de la línea.</p><p><strong>'+ along +'</strong> en kilometros</p>';
            this.calculateArea = ' ';
          }
        }
      };
  changeMapStyle = () =>{
      console.log(this.mapStyleSelected);
      //'mapbox://styles/mapbox/streets-v11',
      this.mapa.setStyle('mapbox://styles/mapbox/' + this.mapStyleSelected);
      this.mapa.on('style.load', this.loadMapData);
  }

  changeLanguage = () =>{
    console.log(this.languageSelected);
    this.mapa.setLayoutProperty('country-label', 'text-field', ['get','name_'+this.languageSelected]);
    this.mapa.setLayoutProperty('state-label', 'text-field', ['get','name_'+this.languageSelected]);
    this.mapa.setLayoutProperty('settlement-label', 'text-field', ['get','name_'+this.languageSelected]);
    this.mapa.setLayoutProperty('settlement-subdivision-label', 'text-field', ['get','name_'+this.languageSelected]);
  }

  showHideLayerByName = (layerName:string, e : any) => {
    console.log( layerName);
    if(e.target.innerHTML === 'Ocultar'){
      e.target.innerHTML = 'Mostrar';
      this.mapa.setLayoutProperty(layerName, 'visibility', 'none');
    }else{
       e.target.innerHTML = 'Ocultar';
       this.mapa.setLayoutProperty(layerName, 'visibility', 'visible');
    }
  }
}
