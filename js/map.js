var clusterSQLpre = "WITH meta AS (    SELECT greatest(!pixel_width!,!pixel_height!) as psz, ext, ST_XMin(ext) xmin, ST_YMin(ext) ymin FROM (SELECT !bbox! as ext) a  ),  filtered_table AS (    SELECT t.* FROM (";

var clusterSQLpost = ") t, meta m WHERE t.the_geom_webmercator && m.ext  ), bucketA_snap AS (SELECT ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 48, m.psz * 48) the_geom_webmercator, count(*) as points_count, 1 as cartodb_id, array_agg(f.cartodb_id) AS id_list  FROM filtered_table f, meta m  GROUP BY ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 48, m.psz * 48), m.xmin, m.ymin), bucketA  AS (SELECT * FROM bucketA_snap WHERE points_count >  48 * 1 ) , bucketB_snap AS (SELECT ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 0.75 * 48, m.psz * 0.75 * 48) the_geom_webmercator, count(*) as points_count, 1 as cartodb_id, array_agg(f.cartodb_id) AS id_list  FROM filtered_table f, meta m  WHERE cartodb_id NOT IN (select unnest(id_list) FROM bucketA)  GROUP BY ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 0.75 * 48, m.psz * 0.75 * 48), m.xmin, m.ymin), bucketB  AS (SELECT * FROM bucketB_snap WHERE points_count >  48 * 0.75 ) , bucketC_snap AS (SELECT ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 0.5 * 48, m.psz * 0.5 * 48) the_geom_webmercator, count(*) as points_count, 1 as cartodb_id, array_agg(f.cartodb_id) AS id_list  FROM filtered_table f, meta m  WHERE cartodb_id NOT IN (select unnest(id_list) FROM bucketA)  AND cartodb_id NOT IN (select unnest(id_list) FROM bucketB)  GROUP BY ST_SnapToGrid(f.the_geom_webmercator, 0, 0, m.psz * 0.5 * 48, m.psz * 0.5 * 48), m.xmin, m.ymin), bucketC  AS (SELECT * FROM bucketC_snap WHERE points_count >  GREATEST(48 * 0.1, 2)  )  SELECT the_geom_webmercator, 1 points_count, cartodb_id, ARRAY[cartodb_id] as id_list, 'origin' as src, cartodb_id::text cdb_list FROM filtered_table WHERE cartodb_id NOT IN (select unnest(id_list) FROM bucketA) AND cartodb_id NOT IN (select unnest(id_list) FROM bucketB) AND cartodb_id NOT IN (select unnest(id_list) FROM bucketC)  UNION ALL SELECT *, 'bucketA' as src, array_to_string(id_list, ',') cdb_list FROM bucketA UNION ALL SELECT *, 'bucketB' as src, array_to_string(id_list, ',') cdb_list FROM bucketB UNION ALL SELECT *, 'bucketC' as src, array_to_string(id_list, ',') cdb_list FROM bucketC";

var sublayers = [];
var mylayers = [];

cartodb.createVis('map', 'https://kyeah.cartodb.com/api/v2/viz/6f8589b6-2f5a-11e5-b4e8-0e9d821ea90d/viz.json')
    .on('done', function(map, layers) {

        // Sorry...hardcoded for now.
        var cluster_sublayer = layers[1].getSubLayer(0);
        var info_sublayer = layers[1].getSubLayer(1);
        var time_sublayer = layers[2];

        sublayers.push(cluster_sublayer);
        sublayers.push(info_sublayer);
        sublayers.push(time_sublayer);

        allSQL = "SELECT * from hlcp_2";
        cluster_sublayer.setSQL(clusterSQLpre + allSQL + clusterSQLpost);
        info_sublayer.setSQL(allSQL);
        time_sublayer.setSQL(allSQL);

        var infowindow = info_sublayer.infowindow;
        infowindow.set('template', function(data) {
            var pre = '<div class="cartodb-popup v2"> \
               <a href="#close" class="cartodb-popup-close-button close">x</a> \
               <div class="cartodb-popup-content-wrapper"> \
                 <div class="cartodb-popup-content">';

            var post = ' \
                 </div> \
               </div> \
             <div class="cartodb-popup-tip-container"></div> \
             </div>';

            var content = '';
            var clickPosLatLng = this.model.get('latlng');            
            var radius = 1;
            //var q = 
            var url = "http://kyeah.cartodb.com/api/v2/sql?q=SELECT%20name,description,date,location,link,year%20from%20hlcp_2%20where%20st_dWithin(the_geom,'SRID=4326;POINT(" + clickPosLatLng[1] + "%20" + clickPosLatLng[0] + ")%27,%20"+radius+"%20" +'%29%20ORDER%20BY%20timestamp%20DESC,%20name%20ASC';

            $.ajax({
                async: false,
                type: 'GET',
                url: url, 
                success: function(data) {
                    _.map(data.rows, function(r) {
                        var name = r.name;
                        if (name.indexOf(r.year) == -1 && r.year) {
                            name += " (" + r.year + ")"
                        }

                        var description = "";
                        if (r.description) {
                            description = '<h4>description</h4> \
                        <p>' + r.description + '</p>';
                        }

                        content += '\
                        <p class="info-row">' + name + '</p> \
                        <div class="hackathon_info" style="display:none"> \
                        <div class="back">back</div> \
                        <h4>name</h4> \
                        <p>' + r.name + '</p> '
                        + description + ' \
                        <h4>date</h4> \
                        <p>' + r.date + '</p> \
                        <h4>location</h4> \
                        <p>' + r.location + '</p> \
                        <h4>link</h4> \
                        <p><a href="' + r.link + '" target="_blank">Link</a></p> \
                        </div>';
                    });
                }
            });
            
            return pre + content + post;
        });

        $(".cartodb-infowindow").on("click", ".info-row", function(e) {
            var next = $(e.target).next();
            console.log(next);
            if (next.css("display") === "none") {
                next.css("display", "block");
            } else {
                next.css("display", "none");
            }
            $(".info-row").css("display", "none");
        });

        $(".cartodb-infowindow").on("click", ".back", function(e) {
            $(e.target).parent().css("display", "none");
            $(".info-row").css("display", "block");
        });        
    });


function callinfowindow(clickPosLatLng, obj) {

    console.log("getting data");
    $.get(url, function(data) {
        console.log("got data: " + data);
        console.log(data.rows);
        var em = $('<div class="cartodb-popup-content jspScrollable" style="max-height: 180px; overflow: hidden; padding: 0px; width: 202px;" tabindex="0">');
        _.map(data.rows, function(r) {
            var element = $('<li><a href="#" onClick="return false;">' + r.name + '</a></li>');
            em.append(element);
        });
        $('.cartodb-popup-wrapper').append(em);
    });

    return $('#infowindow_template').html();
}
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

$('.button').click(function() {
    $('.button').removeClass('selected');
    $(this).addClass('selected');

    var sql = "SELECT * FROM hlcp_2";
    if ($(this).attr('id') != 'all_years') {
        var checked = $('.button.selected').map(function() { return "'%" + this.id + "'" }).get();
        sql = "SELECT * FROM hlcp_2 WHERE date LIKE (" + checked.join() + ")";
    }

    sublayers[0].setSQL(clusterSQLpre + sql + clusterSQLpost);
    sublayers[1].setSQL(sql);
    sublayers[2].setSQL(sql);

    return true;
});

$('#layer_selector li').click(function(e) {
    $('#layer_selector li').removeClass('selected');
    var index = parseInt($(e.target).attr('data'))
    for (i = 0; i < sublayers.length; i++) {
        if (i == index) {
            sublayers[i].show();
            $(e.target).addClass('selected');
        } else {
            sublayers[i].hide();
        }
    }
});
