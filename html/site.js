var selected_id = null;
var raw_data = null;

var global_gender_is_female = null;
var global_nsfw_checked = null;
var global_sfw_checked = null;
var global_min_height = null;
var global_max_height = null;
var global_min_weight = null;
var global_max_weight = null;

function MergeSecondArrayIntoFirst(first, second){
  // Helper function which adds the submission entries which appear in second
  // but not in first, into first
  var used_ids = {};
  for (var i = 0; i < first.length; i++){
    var obj = first[i];
    used_ids[obj.id] = true;
  }

  for (var i = 0; i < second.length; i++){
    var obj = second[i];
    if (!(obj.id in used_ids)){
      first.push(obj);
    }
  }
  return;
}

function GetSubmissionWithId(submission_id){
  // iterate through raw_data and return submission with id
  // this function is EXTREMELY ineffecient. Need to use a
  // hash_map like datastructure of look-up based on id op's
  for (var i = 0; i < raw_data.length; i++){
    var submission = raw_data[i];
    if (submission.id == submission_id){
      return submission;
    }
  }
  // This should never ever happen
  return null;
}

function LoadSubmission(submission_id){
  var submission = GetSubmissionWithId(submission_id);
  // alert("Loaded submission with title: " + submission.title);
  var html_content = "<b>" + submission.title + "</b><br/><br/>";
  if (submission.url) {
    html_content += '<a href="' + submission.url + '">' + submission.url + "</a><br/><br/>" ;
  }

  $("#submission_content").html(html_content);

  if (submission.media_json){
    // submission_image_content
    var image_content_html = "";

    if ('imgur_albums' in submission.media_json && submission.media_json.imgur_albums){
      // TODO: only using the first album url....
      var album_url = submission.media_json.imgur_albums[0];
      // TODO: I think there shouldn't be a trailing slash for albums because the regex will not match a trailing
      // slash
      image_content_html += '<iframe class="imgur-album" width="100%" height="550" frameborder="0" src="'+album_url+'/embed"></iframe> <br/><br/>';


    }

    if ('imgur_images' in submission.media_json && submission.media_json.imgur_images) {

      for (var i = 0; i < submission.media_json.imgur_images.length; i++) {

        // get the large thumbnail
        var image_url = submission.media_json.imgur_images[i];
        image_url = image_url.substr(0, image_url.length-4);
        image_url = image_url + "l.jpg"

        image_content_html += '<img src="'+ image_url + '"> <br/><br/>';


      }
    }


    $("#submission_image_content").html(image_content_html);


  }

  /*
  if (submission.media_embed_json){
    // html_content += "MEDIA_EMBED_JSON: " + submission.media_embed_json;
    var decoded = $('<div/>').html(submission.media_embed_json.content).text();
    // console.log('DECODED' + decoded);
    html_content += "MEDIA_EMBED" + decoded;
    // console.log('embed:' + JSON.stringify(submission.media_embed_json));
  }
  if (submission.media_json){
    html_content += "MEDIA_JSON: " + JSON.toString(submission.media_json);
    // console.log('media:' + JSON.stringify(submission.media_json));
  }
  */

  // if submission.media


}

function InitializeHeightSlider(min_height, max_height) {
  global_min_height = min_height;
  global_max_height = max_height;
  $("#height-slider-range").slider({
    range: true,
    min: min_height,
    max: max_height,
    values: [min_height, max_height],
    slide: function(event, ui) {
      // console.log(JSON.toString(event));
      var min_height_obj = InchesToHeightObj(parseInt(ui.values[0]));
      var max_height_obj = InchesToHeightObj(parseInt(ui.values[1]));
      $("#height").html(HeightStringFromInt(parseInt(ui.values[0])) +
          " - " + HeightStringFromInt(parseInt(ui.values[1])));
    },
    stop: function(event, ui) {
      // console.log("Slider stopped.");
      global_min_height = parseInt(ui.values[0]);
      global_max_height = parseInt(ui.values[1]);
      UpdateTable();
      // TODO: need to refresh the stuff at this time
    }
  });
  // TODO: set the initial values
  $("#height").html(HeightStringFromInt(parseInt($( "#height-slider-range").slider("values", 0))) +
    " - " + HeightStringFromInt(parseInt($("#height-slider-range").slider("values", 1))));
}

function InitializeWeightSlider(min_weight, max_weight) {
  global_min_weight = min_weight;
  global_max_weight = max_weight;
  $("#weight-slider-range").slider({
    range: true,
    min: min_weight,
    max: max_weight,
    values: [min_weight, max_weight],
    slide: function(event, ui) {
      $("#weight").val(ui.values[0] + " lbs to " + ui.values[1] + " lbs");
    },
    stop: function(event, ui) {
      // console.log("Slider stopped.");
      global_min_weight = parseInt(ui.values[0]);
      global_max_weight = parseInt(ui.values[1]);
      UpdateTable();
      // TODO: need to refresh the stuff at this time
    }
  });
  $("#weight").val($( "#weight-slider-range").slider("values", 0) +
    " lbs to " + $("#weight-slider-range").slider("values", 1) + " lbs");
}

function HTMLIdFromHTML(id){
  return "list_" + id;
}

function IdFromHTMLId(html_id){
  return html_id.substr(5);
}

function SelectListElement(html_id){
  // Also unselects the previous element
  if (selected_id) {
    $("#list_" + selected_id).removeClass("active");
  }

  $("#" + html_id).addClass("active");
  selected_id = IdFromHTMLId(html_id);

  LoadSubmission(selected_id);

}

function InchesToHeightObj(height_in){
  var feet = Math.floor(height_in / 12);
  var inches = height_in % 12;
  return {'feet': feet, 'inches': inches};
}

function HeightStringFromInt(height_in){
  var height_obj = InchesToHeightObj(height_in);
  return height_obj.feet.toString() + '&#39;' + height_obj.inches.toString()
}

function GetStringTitle(current){
  // TODO: check to see the previous weight is valid
  var previous_weight = current.previous_weight_lbs;
  var current_weight = current.current_weight_lbs;

  return (HeightStringFromInt(current.height_in) + ' / ' +
      previous_weight.toString() + ' lbs &rarr; ' + current_weight.toString() + ' lbs');
}

function UpdateTable(){
  $( "#image-list-group" ).empty();
  // alert("Update Table Called!");

  // $( "input:radio[name=bar]:checked" ).val();
  // TODO: Filter by the global variables here

  var submissions = crossfilter(raw_data);

  // Filter by gender
  var submissionsByGender = submissions.dimension(function(s) { return s.gender; });
  submissionsByGender.filter(global_gender_is_female);



  // Filter by sfw / nsfw
  var submissionsByNSFW = submissions.dimension(function(s) { return s.adult_content; });
  if (global_nsfw_checked != true || global_sfw_checked != true && (global_nsfw_checked != global_sfw_checked)){
    // Only one is set (not both or none)
    // we only filter if one of the variables is not true
    submissionsByNSFW.filter(global_nsfw_checked);
  }


  // Filter by height
  var submissionByHeight = submissions.dimension(function(s) {return s.height_in;});
  submissionByHeight.filter([global_min_height, global_max_height + 1]); // TODO: add + Math.MIN_VALUE

  console.log('global min height= ' + global_min_height);
  console.log('global max height= ' + global_max_height);

  // Filter by weight
  var submissionByCurrentWeight = submissions.dimension(function(s) {return s.current_weight_lbs;});
  submissionByCurrentWeight.filter([global_min_weight, global_max_weight + 1]);

  var unsorted_results = submissionByCurrentWeight.top(Infinity);

  submissionByCurrentWeight.filterAll(); // Need to clear that filter

  var submissionByPreviousWeight = submissions.dimension(function(s) {return s.previous_weight_lbs;});
  submissionByPreviousWeight.filter([global_min_weight, global_max_weight + 1]);

  var secondary_results = submissionByPreviousWeight.top(Infinity);

  MergeSecondArrayIntoFirst(unsorted_results, secondary_results);

  // Create another crossfilter for this data to sort it by the score
  var cf2 = crossfilter(unsorted_results);
  var submissionByScore = cf2.dimension(function(s) {return s.score;});
  var results = submissionByScore.top(Infinity);


  // var results = secondary_results;
  // Score dimension
  //

  //


  for (var i = 0; i < results.length; i++) {
    // console.log(result[i].id);
    var current = results[i];
    $( "#image-list-group" ).append(
      '<a href="#" class="list-group-item" id="'+ 'list_' + current.id + '">' +
      '<h5 class="list-group-item-heading">' + GetStringTitle(current) + '</h5>'+
      '<p class="list-group-item-text">'+ current.title + '</p>' +
      '</a>');

    // alert(result[i]);
    //Do something
  }
}

$(document).ready(function(){

  // Default Global variables:
  global_gender_is_female = true; // because that is selected by default
  global_nsfw_checked = false; // same as above and below
  global_sfw_checked = true; // because that is selected by default

  // $( "#image-list-group" ).empty();

  $('.btn-group').button();

  $('.bxslider').bxSlider({
    pagerCustom: '#bx-pager'
  });

  $("input[name=gender_radio]:radio").change(function () {
    // TODO: optimization - even if the same option is selected again, this
    // function gets called
    // alert("Radio button changed.");

    var gender_str = $("input:radio[name=gender_radio]:checked").val();
    if (gender_str == "male"){
      global_gender_is_female = false;
    } else {
      global_gender_is_female = true;
    }

    UpdateTable();
  });


  $("#nsfw_checkbox_sfw,#nsfw_checkbox_nsfw").change(function(){
    // alert("One of the checkboxes changed.");
    if ($('#nsfw_checkbox_sfw').prop('checked')){
      global_sfw_checked = true;
      // alert("Clothed is checked");
    } else {
      global_sfw_checked = false;
    }
    if ($('#nsfw_checkbox_nsfw').prop('checked')){
      global_nsfw_checked = true;
      // alert("NSFW is checked");
    } else {
      global_nsfw_checked = false;
    }
    UpdateTable();
  });


  /*
  $("#image-list-group a").click(function(){
  // $(document).on('click', '.list-group a', function () {
    console.log("selected something.");
    console.log("Selected Option Yaz:"+$(this).text());
  });
  */

  // Keep track of which elements are clicked
  $(document).on('click', '#image-list-group a', function () {
  // $("#image-list-group a").on('click', 'p.test', function() {
    // alert('you clicked a p.test element');
    // console.log("Selected Option Maz:"+$(this).text());
    // console.log("Selected Option Maz:" + $(this).attr('id'));
    SelectListElement($(this).attr('id'))
    // TODO: also change shit
  });

  // alert("Atleast this is working.");
  $.getJSON( "json_dump.json", function( data ) {
    raw_data = data.result;
    // console.log(result);



    // Figure out the min and max heights and weights using cross filter

    var submissions = crossfilter(raw_data);
    var submissionsByHeight = submissions.dimension(function(d) { return d.height_in; });
    // TODO: assumption that there was a result (because we are dereferencing [0]
    var topHeight = submissionsByHeight.top(1)[0].height_in;
    var bottomHeight = submissionsByHeight.bottom(1)[0].height_in;
    console.log('top height: ' + topHeight + ' bottom height: ' + bottomHeight);

    // TODO: deal with case when there is no Previous weight...?
    var submissionsByPreviousWeight = submissions.dimension(function(d) { return d.previous_weight_lbs; });
    var submissionsByCurrentWeight = submissions.dimension(function(d) { return d.current_weight_lbs; });

    var topPreviousWeight = submissionsByPreviousWeight.top(1)[0].previous_weight_lbs;
    var topCurrentWeight = submissionsByCurrentWeight.top(1)[0].current_weight_lbs;

    var bottomPreviousWeight = submissionsByPreviousWeight.bottom(1)[0].previous_weight_lbs;
    var bottomCurrentWeight = submissionsByCurrentWeight.bottom(1)[0].current_weight_lbs;

    var topWeight = Math.max(topPreviousWeight, topCurrentWeight);
    var bottomWeight = Math.min(bottomPreviousWeight, bottomCurrentWeight);



    // var min_height = ;

    InitializeHeightSlider(bottomHeight, topHeight);
    InitializeWeightSlider(bottomWeight, topWeight);

    UpdateTable();



    // selected_id = IdFromHTMLId($("#image-list-group a:first-child").attr('id'));
    // The first element

    // $("#image-list-group a:first-child").addClass("active");
    // Select the first element in the table
    var first_html_id = $("#image-list-group a:first-child").attr('id');
    // TODO: uncomment the line below
    // TODO: only execute the line below if there are results to begin with...?(but should be the case)
    // SelectListElement(first_html_id);


  });


});