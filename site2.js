var listView = null;
// var compiled = _.template('<span><img class="lazy-img" data-original="${image_url}" height="400" width="400" /></span><br/>');
var columns = null;
var nextIndexForPhoto = 0;
var raw_data = null;  // never use raw_data for results. use filtered_submissions
var filtered_submissions = null;

var DEFAULT_IMAGE_WIDTH = 400;
var MIN_IMAGE_WIDTH = 200;
// NOTE: imageWidth can change if it's a 1-column image site. It's a hack-around to make it look good on mobile
var imageWidth = DEFAULT_IMAGE_WIDTH;
var columnBorderWidth = 20;  // border on each side of a column

var compiledImageEntryTemplate =  _.template($('#image-entry-template').html());

// var global_units_imperial = true;

var global_min_weight = null;
var global_max_weight = null;
var global_min_height = null;
var global_max_height = null;

var last_selected_weight = null;
var last_selected_height = null;

var rangeSliderWeight = null;
var rangeSliderHeight = null;

var weightMargin = 5;
var heightMargin = 1;

var numberOfResults = {};

var INFINITY_ON = false;
var NUM_ROWS_TO_DRAW_EACH_TIME = 10;  // Number of rows to draw after each scroll event

// Better Scroll Trigger
var DISTANCE_FROM_BOTTOM_BEFORE_DRAWING_BOXES = 250;

function InchesToHeightObj(height_in){
    var feet = Math.floor(height_in / 12);
    var inches = height_in % 12;
    return {'feet': feet, 'inches': inches};
}

function InchesToCm(height_in) {
    return height_in * 2.54;
}

function UnitsAreImperial() {
    return $("input[name=units_radio]:checked").val() == 'imperial';
}

function HeightStringFromInt(height_in){
    if (UnitsAreImperial()) {
        var height_obj = InchesToHeightObj(height_in);
        return height_obj.feet.toString() + '&#39;' + height_obj.inches.toString();
    } else {
        return Math.round(InchesToCm(height_in)).toString() + ' cm';
    }
}

function WeightStringFromWeight(weight_lbs){
    if (UnitsAreImperial()) {
        return weight_lbs.toString() + ' lbs';
    } else {
        return Math.round(weight_lbs / 2.2).toString() + ' kg';
    }
}

function destroyLightBox() {
    $lg = $("#lightgallery");
    if ($lg.data('lightGallery') === undefined) {
        return;
    }
    $lg.data('lightGallery').destroy(true);
    $lg.empty();  // clear html
}

function lightboxImage(image_id, first_image) {
    var image_url = imageUrlForImageID(image_id, 'h');
    var image_url_thumb = imageUrlForImageID(image_id, 's');
    var $a = $("<a>", {href: image_url});
    $a.attr('data-exThumbImage', image_url_thumb);
    // console.log('$a: ' + $a.prop('outerHTML'));
    if (first_image == true) {
        $a.attr('id', 'first_image');
    }
    var $image = $("<img>", {src: image_url});
    $a.append($image);
    return $a;
}

function openLightBox(index) {
    // index is the index in raw_data (TODO - need to rename raw_data)
    // alert('images: ' + JSON.stringify(raw_data[index].photos));

    // Just in case:
    // console.log('openLightBox called with index = ' + index);
    destroyLightBox();

    // Build lightbox
    $lg = $("#lightgallery");
    // var $first_image = $("<img>", {id: 'first_image', src: ''});
    // var html = '<a href="http://imgur.com/old22m.jpg" id="first_image"> <img src=" /> </a> <a href="http://imgur.com/W0BpBm.jpg"> <img src="http://imgur.com/W0BpBm.jpg" /> </a>';

    var current = filtered_submissions[index];
    // var image_id = current.photos[0];
    for (var i = 0; i < current.photos.length; i++) {
        var image_id = current.photos[i];
        var lightBox = lightboxImage(image_id, i == 0);  // so we mark the first image as first_image
        $lg.append(lightBox);
    }
    // $lg.html(html);
    $("#lightgallery").lightGallery({
        'download': false,
        'exThumbImage': 'data-exThumbImage'
    });

    // Launch Lightbox
    $('#first_image').click();

    // We destroy Lightbox on close
    // Hopefully this thing doesn't have memory leaks
    $lg.on('onCloseAfter.lg',function(event){
        // onCloseAfter.lg;
        destroyLightBox();
    });

}

function imageUrlForImageID(image_id, size) {
    // size has to be 's', 'm', or 'l'
    var image_url = 'http://imgur.com/' + image_id + size + '.jpg';
    return image_url;
}

function resetSpinner(){
    $('#spinner-div').html("<img src='spinner.gif' class=spinner alt='Loading...'>");
}

function row() {
    var colIndex, length, $minCol, $currCol;
    for (var i = 0, length = columns.length; i < length; i++) {// for(index = 0, length = columns.length; index < length; index++) {


        // Determine the min column (column with the minimum length)
        // We do this so each column is the same length
        var $minCol = null;
        for(colIndex = 0; colIndex < length; colIndex++) {
            $currCol = $(columns[colIndex]);
            if(!$minCol) $minCol = $currCol;

            // The bug is that the CSS in the HTML makes each column think it's the same height
            if ($currCol.height() < $minCol.height()) {
                $minCol = $currCol;
            }
            //  else $minCol = $minCol.height() > $currCol.height() ? $currCol : $minCol;
        }
        /*
        for(colIndex = 0; colIndex < length; colIndex++) {
            $currCol = $(columns[colIndex]);

            if(!$minCol) $minCol = $currCol;
            else $minCol = $minCol.height() > $currCol.height() ? $currCol : $minCol;
        }
        */

        // If we don't have any more results to show
        if (nextIndexForPhoto >= filtered_submissions.length) {
            // TODO - I need to handle this case better so it doesn't get here.
            // Best I can do for now.
            // TODO - I should display something to tell users there are no more submissions
            $('#spinner-div').html("No more results.");
            return;
        } else {
            // Show spinner
            resetSpinner();


        }

        // console.log(JSON.stringify(raw_data[i]));
        var current = filtered_submissions[nextIndexForPhoto];

        var image_id = current.photos[0];  // we take the first image
        // var image_url = 'http://imgur.com/' + image_id;

        // image_url = image_url.substr(0, image_url.length-4);
        // var image_url_large = image_url + "l.jpg";
        var image_url_medium = imageUrlForImageID(image_id, 'l');  // TODO - rename. It's large instead of medium
        var image_url_small = imageUrlForImageID(image_id, 's');

        // TODO - use something cleaner like strcat
        var gender_string = "";
        if (current.gender == true) {
            gender_string = 'female';
        } else {
            gender_string = 'male';
        }




        // all_grid_element_html.push(grid_elemen);
        // all_grid_element_html = all_grid_element_html + grid_element_html;
        // var html = compiled({'image_url': image_url_medium});
        var image_height = Math.round(imageWidth / current.first_image_aspect_ratio);
        // var height = 400;
        var previous_weight_str = WeightStringFromWeight(current.previous_weight_lbs);
        var current_weight_str = WeightStringFromWeight(current.current_weight_lbs);
        // console.log('previous_weight_str: ' + previous_weight_str);
        var height_str = HeightStringFromInt(current.height_in);
        // console.log(JSON.stringify(current));
        var html = compiledImageEntryTemplate({'submission_id': current.id, 'height_str': height_str, 'previous_weight_str': previous_weight_str, 'current_weight_str': current_weight_str, 'index': nextIndexForPhoto, 'image_url': image_url_medium, 'image_height': image_height, 'image_width': imageWidth});
        // var html = '<div><img onclick="openLightBox('+ nextIndexForPhoto +')" class="lazy-img" data-original="' + image_url_medium + '" height="'+ height +'" width="' + imageWidth + '" /></div>';

        // Append it to the column with the lowest height
        if (INFINITY_ON) {
            $minCol.data('listView').append(html);
        } else {
            $minCol.append(html);
        }
        nextIndexForPhoto++;
        // listView.append(html);
        // console.log('appending: ' + c);
        // alert(result[i]);
        //Do something
    }
}

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

function isGenderFemale(){
    // Return value of radio == female
    return $("input[name=gender_radio]:checked").val() == 'female';
}

function deleteBoxes(){
    if (columns !== null) {
        console.log('resetting ' + columns.length  +'columns');
        if (INFINITY_ON) {
            columns.each(function () {
                // remove
                $(this).data('listView').remove();
            });
        } else {
            columns.each(function () {
                $(this).remove();
            });
        }
    }
}


function resetBoxes(){
    // Function that is called when any of the filtering or options are set.
    resetSpinner();

    //console.log('resetBoxes called!');
    // Reset Columns Views
    // columns = $('.infinite');

   deleteBoxes();


    //console.log('windowWidth: ' + $( window ).width());
    // console.log('documentWidth: ' + $( document ).width());
    var widthOfOneColumn = imageWidth + 2 * columnBorderWidth;
    var windowWidth = $(window).width()
    console.log('window_width: ' + windowWidth);
    var num_columns = Math.max(1, Math.floor(windowWidth / widthOfOneColumn));
    if (num_columns == 1) {
        // TODO - not positive WHY I need to use the COLUMN_BUFFER, but it's needed.
        // There seems to be some sort of CSS style buffer of 10 pixels around the image in addition to whatever
        // OHHHH -- it's probably the width of the div with id #contained (the one that encapsulates the columns)
        var COLUMN_BUFFER = 20;
        imageWidth = Math.max(MIN_IMAGE_WIDTH, windowWidth - (2 * columnBorderWidth) - COLUMN_BUFFER);
    } else {
        imageWidth = DEFAULT_IMAGE_WIDTH;
    }

    // var num_columns = 2;
    //console.log('num_columns: ' + num_columns);
    $('#float-wrap').html('');  // Clear the container for the infinite columns
    for (var i = 0; i < num_columns; i++) {
        var $div = $("<div>", {class: "infinite infinite-scroll-column"});
        $div.css('border-left-width', columnBorderWidth);
        $div.css('border-right-width', columnBorderWidth);
        // var html = '<div class="infinite infinite-scroll-column"></div>';
        $('#float-wrap').append($div);
    }


    columns = $('.infinite');
    console.assert(columns.length > 0, "No columns present!");

    if (INFINITY_ON) {
        columns.each(function () {
            listView = new infinity.ListView($(this), {
                lazy: function () {
                    $(this).find('.lazy-img').each(function () {
                        var $ref = $(this);
                        $ref.attr('src', $ref.attr('data-original'));
                    });
                    // console.log('elem data: ' + getMethods(elem));
                    // console.log('elem attr: ' + elem.getAttribute('data-original'));
                    // $(elem).attr('src', $(elem).attr('data-original'));}
                }
            });
            $(this).data('listView', listView);
        });
    }

    // We reset the index since we're resetting the boxes
    nextIndexForPhoto = 0;







    console.assert(raw_data !== null, "No data present!");
    var submissions = crossfilter(raw_data);

    // Filter by gender
    var submissionsByGender = submissions.dimension(function(s) { return s.gender; });
    submissionsByGender.filter(isGenderFemale());

    // Filter by sfw / nsfw
    /*
     var submissionsByNSFW = submissions.dimension(function(s) { return s.adult_content; });
     if (global_nsfw_checked == false){
     // Only one is set (not both or none)
     // we only filter if one of the variables is not true
     submissionsByNSFW.filter(false);
     }
     */
    // filtered_submissions = submissionsByGender.top(Infinity);




    // Filter by height
    // TODO - height filtering isn't working.
    // See what I did in the other code

    // var submissionByHeight = submissions.dimension(function(s) {return s.height_in;});
    var submissionsByHeight = submissions.dimension(function(d) { return d.height_in; });


    var currentSelectedHeight = Math.round(rangeSliderHeight.noUiSlider.get());
    // var heightApproxRatio = 0.01;
    var minHeight = currentSelectedHeight - heightMargin;
    var maxHeight = currentSelectedHeight + heightMargin;

    submissionsByHeight.filter([minHeight, maxHeight + 1]);

    //console.log('submissionsByHeight: ' + JSON.stringify(submissionsByHeight.top(20)));

    //console.log('for filtering -- min height= ' + minHeight);
    //console.log('for filtering -- max height= ' + maxHeight);




    // Filter by weight
    // var approxRatio = 0.03;
    var submissionByCurrentWeight = submissions.dimension(function(s) {return s.current_weight_lbs;});
    var submissionByPreviousWeight = submissions.dimension(function(s) {return s.previous_weight_lbs;});



    var selectedWeight = Math.round(rangeSliderWeight.noUiSlider.get());
    var selectedTopWeight = selectedWeight + weightMargin;
    var selectedBottomWeight = selectedWeight - weightMargin;

    submissionByCurrentWeight.filter([selectedBottomWeight, selectedTopWeight + 1]);

    var unsorted_results = submissionByCurrentWeight.top(Infinity);

    submissionByCurrentWeight.filterAll(); // Need to clear that filter

    submissionByPreviousWeight.filter([selectedBottomWeight, selectedTopWeight + 1]);

    var secondary_results = submissionByPreviousWeight.top(Infinity);

    MergeSecondArrayIntoFirst(unsorted_results, secondary_results);

    // Create another crossfilter for this data to sort it by the score
    var cf2 = crossfilter(unsorted_results);
    var submissionByScore = cf2.dimension(function(s) {return s.score;});
    filtered_submissions = submissionByScore.top(Infinity);



}

function drawMoreBoxes(){
    for (var i = 0; i < NUM_ROWS_TO_DRAW_EACH_TIME; i ++ ) {
        row();
    }

    if (!INFINITY_ON) {
        // Since Infinity is not on, we have to do it oursvelves

        $lazy_images = columns.find('.lazy-img');
        $lazy_images.each(function() {
            $(this).attr('src', $(this).attr('data-original'));
        });
    }
}

function round5(x)
{
    return Math.round(x/5)*5;
}

function addToNumberOfResults(gender, height, weight) {
    // This function basically is like a default dict / counter in python
    if (!numberOfResults.hasOwnProperty(gender)) {
        numberOfResults[gender] = {};
    }
    if (!numberOfResults[gender].hasOwnProperty(height)) {
        numberOfResults[gender][height] = {};
    }
    if (!numberOfResults[gender][height].hasOwnProperty(weight)) {
        numberOfResults[gender][height][weight] = 0;
    }
    numberOfResults[gender][height][weight] += 1;
}

function getNumberOfResultsExactMeasurements(gender, height, weight){
    if (!numberOfResults.hasOwnProperty(gender)) {
        return 0;
    }
    if (!numberOfResults[gender].hasOwnProperty(height)) {
        return 0;
    }
    if (!numberOfResults[gender][height].hasOwnProperty(weight)) {
        return 0;
    }
    return numberOfResults[gender][height][weight];
}

function getNumberOfResults(gender, height, weight) {
    var num_results = 0;
    for (var cur_weight = weight - weightMargin; cur_weight <= weight + weightMargin; cur_weight++) {
        num_results += getNumberOfResultsExactMeasurements(gender, height, cur_weight);
    }
    return num_results;
}

function downloadContent(){
    Papa.parse("csv_dump.csv", {
        download: true,
        dynamicTyping: true,
        header:true,
        skipEmptyLines:true,
        complete: function(results) {
            raw_data = results.data;




            // Using JSON
            // raw_data = data.result;
            // var limit = 100;
            // Parse the imgur urls:

            // console.log(raw_data);
            for (var i = 0; i < raw_data.length; i++){
                // console.log(raw_data[i]);
                //console.log(typeof raw_data[i].current_weight_lbs)
                //assert(typeof raw_data[i].current_weight_lbs === 'number', 'Error: Weight is not a number');
                raw_data[i]['photos'] = raw_data[i].photos.split(',');
            }

            var submissions = crossfilter(raw_data);


            var submissionByCurrentWeight = submissions.dimension(function(s) {return s.current_weight_lbs;});
            var submissionByPreviousWeight = submissions.dimension(function(s) {return s.previous_weight_lbs;});
            // Get the top weight
            var topPreviousWeight = submissionByPreviousWeight.top(1)[0].previous_weight_lbs;
            var topCurrentWeight = submissionByCurrentWeight.top(1)[0].current_weight_lbs;

            var bottomPreviousWeight = submissionByPreviousWeight.bottom(1)[0].previous_weight_lbs;
            var bottomCurrentWeight = submissionByCurrentWeight.bottom(1)[0].current_weight_lbs;

            var submissionsByHeight = submissions.dimension(function(d) { return d.height_in; });
            // TODO: assumption that there was a result (because we are dereferencing [0]

            global_max_height = submissionsByHeight.top(1)[0].height_in;
            global_min_height = submissionsByHeight.bottom(1)[0].height_in;

            global_max_weight = Math.max(topPreviousWeight, topCurrentWeight);
            global_min_weight = Math.min(bottomPreviousWeight, bottomCurrentWeight);
            //console.log('global_min_weight: ' + global_min_weight);
            //console.log('global_max_weight: ' + global_max_weight);

            // TODO - precompute the number of results
            for (var i = 0; i < raw_data.length; i++){
                var current = raw_data[i];
                var gender = current.gender;
                for (var height = current.height_in - heightMargin; height <= current.height_in + heightMargin; height++) {
                    addToNumberOfResults(gender, height, current.previous_weight_lbs);
                    addToNumberOfResults(gender, height, current.current_weight_lbs);
                }
            }
            console.log('numberOfResults:');
            // console.log(JSON.stringify(numberOfResults));
            /*
            var submissionsByGender = submissions.dimension(function(s) { return s.gender; });
            var genders = [false, true];
            for (var i = 0; i < genders.length; i++){
                var gender = genders[i];
                submissionsByGender.filter(gender);
                numberOfResults[gender] = {};
                for (var height = global_min_weight; height <= global_max_weight; height++) {
                    // TODO - filter by height
                    numberOfResults[gender][height] = {};
                    var submissionsByHeight = submissions.dimension(function(d) { return d.height_in; });
                    var minHeight = height - heightMargin;
                    var maxHeight = height + heightMargin;
                    submissionsByHeight.filter([minHeight, maxHeight + 1]); // TODO: add + Math.MIN_VALUE

                    for (var weight = global_min_weight; weight <= global_max_weight; weight++) {
                        // Count the number of results
                        // There might be some double counting if a record falls under the same previous and current bucket
                        // This function is horribly inefficient. UGH.
                        var num_results = 0;
                        submissionByPreviousWeight.filter([weight-weightMargin, weight+weightMargin + 1]);
                        num_results += submissionByPreviousWeight.top(Infinity).length;
                        submissionByPreviousWeight.filterAll();
                        submissionByCurrentWeight.filter([weight-weightMargin, weight+weightMargin + 1]);
                        num_results += submissionByCurrentWeight.top(Infinity).length;
                        submissionByCurrentWeight.filterAll();
                        numberOfResults[gender][height][weight] = num_results;
                    }

                    submissionsByHeight.filterAll();
                }

                submissionsByGender.filterAll();

            }
            */



            // TODO - set up Slider
            rangeSliderWeight = document.getElementById('slider-range-weight');

            // TODO - I should NOT hardcode 250 and 400 below. I should actually do it based on the actual weights
            noUiSlider.create(rangeSliderWeight, {
                start: [180],  // TODO - currently arbitrary default weight
                step: 5,
                tooltips:[false],
                range: {
                    'min': [ round5(global_min_weight)  ],
                    'max': [ round5(global_max_weight) ],
                    '70%': [250], // Hack for now
                    '90%': [400]
                }
            });


            rangeSliderWeight.noUiSlider.on('update', function( values, handle ) {
                // TODO - consider unifying this code with the code for the height changes. THis is duplication
                // console.log('values: ' + values);
                // $('#selected_weight').val(values[0]);
                updateWeightDiv(Math.floor(values[handle]));
                // rangeSliderValueElement.innerHTML = values[handle];

            });

            rangeSliderWeight.noUiSlider.on('slide', function( values, handle ) {
                // TODO - consider unifying this code with the code for the height changes. THis is duplication
                // console.log('values: ' + values);
                // $('#selected_weight').val(values[0]);
                var height = rangeSliderHeight.noUiSlider.get();
                setCurrentNumberOfResults(height, values[handle]);
                // updateWeightDiv(Math.floor(values[handle]))
                // rangeSliderValueElement.innerHTML = values[handle];

            });


            rangeSliderWeight.noUiSlider.on('set', function( values, handle ) {
                var selectedWeight = values[handle];
                $('#number-of-results').css('display', 'none');
                // $('#number-of-results').removeClass('display-table-class');
                // $('#number-of-results').addClass('display-none-class');
                // console.log('selectedWeight: ' + selectedWeight);
                //if (selectedWeight != last_selected_weight) {
                    last_selected_weight = selectedWeight;
                    resetBoxes();
                    drawMoreBoxes();

                //}

            });



            // Height
            rangeSliderHeight = document.getElementById('slider-range-height');

            // TODO - set the real height
            noUiSlider.create(rangeSliderHeight, {
                start: [ 68],  // TODO -currently arbitrarily default height
                tooltips:[false],
                step: 1,
                range: {
                    'min': [  global_min_height ],
                    'max': [ global_max_height ],
                }
            });

            rangeSliderHeight.noUiSlider.on('update', function( values, handle ) {
                // console.log('values: ' + values);
                // $('#selected_weight').val(values[0]);
                updateHeightDiv(values[handle]);
                // rangeSliderValueElement.innerHTML = values[handle];

            });

            rangeSliderHeight.noUiSlider.on('slide', function( values, handle ) {
                // console.log('values: ' + values);
                // $('#selected_weight').val(values[0]);
                var weight = rangeSliderWeight.noUiSlider.get();
                setCurrentNumberOfResults(values[handle], weight);
                // updateHeightDiv(values[handle]);
                // rangeSliderValueElement.innerHTML = values[handle];

            });

            rangeSliderHeight.noUiSlider.on('set', function( values, handle ) {
                var selectedHeight = values[handle];
                $('#number-of-results').css('display', 'none');
                // $('#number-of-results').removeClass('display-table-class');
                // $('#number-of-results').addClass('display-none-class');
                // console.log('selectedHeight: ' + selectedHeight);
                // We removed the check below since we destroy the boxes on update
                //if (selectedHeight != last_selected_height) {
                    last_selected_height = selectedHeight;
                    resetBoxes();
                    drawMoreBoxes();
                //}
            });

            // Now that everything is added, NOW call the layout method
            resetBoxes();
            drawMoreBoxes();
            // layoutGrid()

        }
    });
}

function setCurrentNumberOfResults(height, weight){
    height = Math.round(height);
    weight = Math.round(weight);
    var gender = isGenderFemale();
    deleteBoxes();
    $('#spinner-div').html("");
    // $('#number-of-results').css('display', )
    $('#number-of-results').removeAttr('style');
    // $('#number-of-results').removeClass('display-none-class');
    // $('#number-of-results').addClass('display-table-class');
    // TODO - get the height and weight
    var num_results = getNumberOfResults(gender, height, weight);
    /*console.log('numberOfResults: ' + JSON.stringify(numberOfResults));*/
    /*
    if (gender in numberOfResults && height in numberOfResults[gender] && weight in numberOfResults[gender][height]) {
        num_results = numberOfResults[gender][height][weight];
    }
    */
    // console.log('gender: ' + gender.toString() + 'height: ' + height.toString() + 'weight: ' + weight.toString());
    //console.log('numberOfResults[gender][height][weight] = ' + numberOfResults[gender][height][weight]);
    $('#number-of-results').html(num_results.toString() + ' results');
}

function updateHeightDiv(height_in) {
    var rangeSliderValueElement = document.getElementById('selected_height');
    rangeSliderValueElement.innerHTML = HeightStringFromInt(height_in);
}

function updateWeightDiv(weight_lbs) {
    var rangeSliderValueElement = document.getElementById('selected_weight');
    rangeSliderValueElement.innerHTML = WeightStringFromWeight(weight_lbs);
}

function onscreen($el) {
    var viewportBottom = $(window).scrollTop() + $(window).height();
    return $el.offset().top <= viewportBottom;
}

function getMethods(obj) {
    var result = [];
    for (var id in obj) {
        try {
            if (typeof(obj[id]) == "function") {
                result.push(id + ": " + obj[id].toString());
            }
        } catch (err) {
            result.push(id + ": inaccessible");
        }
    }
    return result;
}


$(document).ready(function() {
    // console.log('hello!');
    // var $el = $('#my-infinite-container');

    // TODO - set gender and english radio
    //$('input:radio[name="gender_radio"]').filter('[value="female"]').attr('checked', true);
    //$('input:radio[name="units_radio"]').filter('[value="english"]').attr('checked', true);
    $('input:radio[name=gender_radio]')[1].checked = true;  // select Female by default
    $('input:radio[name=units_radio]')[0].checked = true;  // select english by default

    $("input[name='gender_radio']").change(function() {
        // console.log("gender_radio changed");
        resetBoxes();
        drawMoreBoxes();
        // rangeSliderHeight.noUiSlider.fireEvent('update');
        // rangeSliderHeight.noUiSlider.set(l;
        // rangeSliderHeight.noUiSlider.set(last_selected_height);
    });

    $("input[name='units_radio']").change(function() {
        // console.log("units_radio changed");
        updateHeightDiv(Math.floor(rangeSliderHeight.noUiSlider.get()));
        updateWeightDiv(Math.floor(rangeSliderWeight.noUiSlider.get()));
        resetBoxes();
        drawMoreBoxes();
        // TODO - need to refresh the whole table to support this
         // rangeSliderHeight.noUiSlider.dispatchEvent('update');
        // rangeSliderHeight.no
        // rangeSliderHeight.noUiSlider.set(last_selected_height);
    });








    /*
    columns.each(function() {
        var listView = new ListView($(this), {
            lazy: function() {
                $(this).find('.pug').each(function() {
                    var $ref = $(this);
                    $ref.attr('src', $ref.attr('data-original'));
                });
            }
        });
        $(this).data('listView', listView);
    });
    */

    // var spinner = $(spinnerTemplate());
    downloadContent();


    var updateScheduled = false;
    var spinner = $('#spinner-div');


    /*
    var spinnerTemplate = _.template($('#spinner-template').html());
    var spinner = $(spinnerTemplate());
    spinner.insertAfter($('#container'));
    // spinner.insertAfter($('#demo').closest('.row'));
    */


    $(window).on('scroll', function() {
        if(!updateScheduled) {
            setTimeout(function() {

                // TODO
                if($(window).scrollTop() + $(window).height() > $(document).height() - DISTANCE_FROM_BOTTOM_BEFORE_DRAWING_BOXES) {
                    drawMoreBoxes();
                }
                // if(onscreen(spinner)) drawMoreBoxes();
                updateScheduled = false;
            }, 500);
            updateScheduled = true;
        }
    });


    // Lazy load images
    // downloadContent();
    // ... When adding new content:



    // var $newContent = $('<p>Hello World</p>');
    // listView.append($newContent);



});






