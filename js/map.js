var sublayers = [];

var LayerActions = {
    2011: function(){
        sublayers[0].setSQL("SELECT * FROM ne_10m_populated_places_simple");
        return true;
    },
    2012: function(){
        sublayers[0].setSQL("SELECT * FROM ne_10m_populated_places_simple WHERE featurecla = 'Admin-0 capital'");
        return true;
    },
    megacities: function(){
        sublayers[0].setSQL("SELECT * FROM ne_10m_populated_places_simple WHERE megacity = 1");
        return true;
    }
}

cartodb.createVis('map', 'https://kyeah.cartodb.com/api/v2/viz/6f8589b6-2f5a-11e5-b4e8-0e9d821ea90d/viz.json')
    .on('done', function(map, layers) {
        // change the query for the first layer
        var sublayer = layers[1].getSubLayer(0);
        console.log(sublayer);
        sublayers.push(sublayer);
        /*
        map.overlayMapTypes.setAt(1, layers[1]);
        var sublayer = layer[1].getSubLayer(0);
        sublayer.setCartoCSS(systemcartoCSS);

        layers.SystemLyr = sublayer
        var infowindow = sublayer.infowindow

        infowindow.set('template', function(data) {

            var clickPosLatLng = this.model.get('latlng');
            var fields = this.model.get('content').fields;

            if (fields && fields[0].type !== 'loading') {

                var obj = _.find(fields, function(obj) {
                    return obj.title == 'kml_key'
                }).value

                callinfowindow(clickPosLatLng, obj)

            }
        }); // end infowindow set
        */
    });

$('.button').click(function() {
    $('.button').removeClass('selected');
    $(this).addClass('selected');
    var checked = $('.button.selected').map(function() { return "'%" + this.id + "'" }).get();
    console.log(checked);
    console.log("SELECT * FROM hlcp_2 WHERE date LIKE (" + checked.join() + ");");
    sublayers[0].setSQL("SELECT * FROM hlcp_2 WHERE date LIKE (" + checked.join() + ");");
    return true;
});

