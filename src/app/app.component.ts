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
  layerColors = ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494','#fed976','#feb24c','#fd8d3c','#f03b20','#bd0026'];
  layerColorSelected ;
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
    this.layerList.push({name:'states-layer', type:'polygon'});
    this.loadGeoJsonFromObject(minesotaJson, 'states');

    //set style polygon layer
    this.setStylePolygonLayer('states-layer', 'states', 'rgba(249, 249, 3, 0.4)', 'rgba(255, 41, 12, 1)');

    //set popup info layer
    this.popupInfoLayer('states-layer', 'name', 'wikipedia', 'Wikipedia', true);
    
    //set ponter when is over the layer 
    this.mouseEnterLeave('states-layer');

    //LOAD OTHER LAYER 
    this.layerList.push({name:'pointLayers-layer', type: 'circle'});
    this.loadGeoJsonFromUrl('pointLayers','https://tile-server.dev.geonodosoft.cl/albergues_20200625052159.geojson' );
    
    //set style layer
    this.setStyleCircleLayer('pointLayers-layer', 'pointLayers', '#FBFF0C', '#0C3CFF');

    //set popup info layer
    this.popupInfoLayer('pointLayers-layer', 'ejecutor', 'dispositivo', 'Dispositivo', false);

    //set ponter when is over the layer 
    this.mouseEnterLeave('pointLayers-layer');


    //LOAD SCHOOL LAYER 
    this.layerList.push({name:'schoolLayers-layer',type:'circle'});
    this.loadGeoJsonFromUrl('schoolLayers','https://tile-server.dev.geonodosoft.cl/acciona_20200721111409.geojson' );
    
    //set style layer //https://docs.mapbox.com/mapbox-gl-js/example/cluster/
    this.setStyleCircleLayer('schoolLayers-layer', 'schoolLayers', '#29FF0C', '#168C06');

    //set popup info layer
    this.popupInfoLayer('schoolLayers-layer', 'nombre_de_', 'direccion', 'Dirección', false);

    //set ponter when is over the layer 
    this.mouseEnterLeave('schoolLayers-layer');  

    //load image in map  
    this.loadImageInMapFromUrl();

    //WMS ??????
    //da errores con el pama satelital. puede ser por el tipo de tile q se esta incrustando (mismo tipo)
    this.mapa.addSource('wms-test-source', {
        'type': 'raster',
        // use the tiles option to specify a WMS tile source URL
        // https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/
        'tiles': [
          'https://img.nj.gov/imagerywms/Natural2015?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Natural2015'
        ],
        'tileSize': 256
      });
    this.mapa.addLayer({
        'id': 'wms-test-layer',
        'type': 'raster',
        'source': 'wms-test-source',
        'paint': {}
        },'aeroway-line');

    //load GeoJson fom url using cluster
    this.loadGeoJsonClusterFromUrl();
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

  changeLayerColor = (color:string) =>{
    console.log(color);
    console.log(this.layerColorSelected);
    const layerInfo = this.layerColorSelected.split("|");
    console.log(layerInfo[0]);
    console.log(layerInfo[1]);
    if('polygon' === layerInfo[1]){
      this.mapa.setPaintProperty(layerInfo[0], 'fill-color', color);
    }else{
      this.mapa.setPaintProperty(layerInfo[0], 'circle-color', color);
    }
    //this.mapa.setPaintProperty(this.layerColorSelected, 'fill-color', color); //circle-color
  }
  loadGeoJsonClusterFromUrl = () => {
    this.mapa.addSource('earthquakes', {
      type: 'geojson',
      // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
      // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
      data:
      'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson',
      cluster: true,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    this.mapa.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'earthquakes',
        filter: ['has', 'point_count'],
        paint: {
          // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
          // with three steps to implement three types of circles:
          //   * Blue, 20px circles when point count is less than 100
          //   * Yellow, 30px circles when point count is between 100 and 750
          //   * Pink, 40px circles when point count is greater than or equal to 750
          'circle-color': [ 'step', ['get', 'point_count'],'#51bbd6', 100,'#f1f075',750,'#f28cb1' ],
          'circle-radius': ['step',['get', 'point_count'], 20, 100, 30, 750, 40]
        }
      });

    this.mapa.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'earthquakes',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    this.mapa.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'earthquakes',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    this.mapa.on('click', 'clusters', this.clusterClickInspectEvent);
    this.mapa.on('click', 'unclustered-point', this.clusterClickDetailEvent);
    //set ponter when is over the layer 
    this.mouseEnterLeave('clusters');  
  }
  // inspect a cluster on click 
  clusterClickInspectEvent = (e:any) => {
    const features = this.mapa.queryRenderedFeatures(e.point, {
        layers: ['clusters']
        });
    const clusterId = features[0].properties.cluster_id;
    this.mapa.getSource('earthquakes')
        .getClusterExpansionZoom(clusterId, (err, zoom) =>{
          if (err) return;
          this.mapa.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
      );
  }

  // When a click event occurs on a feature in
  // the unclustered-point layer, open a popup at
  // the location of the feature, with
  // description HTML from its properties.
  clusterClickDetailEvent = (e:any) => {      
    const coordinates = e.features[0].geometry.coordinates.slice();
    const mag = e.features[0].properties.mag;
    let tsunami;
    
    if (e.features[0].properties.tsunami === 1) {
      tsunami = 'yes';
    } else {
      tsunami = 'no';
    }
    
    // Ensure that if the map is zoomed out such that
    // multiple copies of the feature are visible, the
    // popup appears over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }
    
    new Mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML('magnitude: ' + mag + '<br>Was there a tsunami?: ' + tsunami)
      .addTo(this.mapa);

  }

}
