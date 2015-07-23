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

    var sql = "SELECT * FROM hlcp_2 WHERE date LIKE (" + checked.join() + ")";
    sublayers[0].setSQL(clusterSQLpre + sql + clusterSQLpost);
    sublayers[1].setSQL(sql);
    sublayers[2].setSQL(sql);

    return true;
});
