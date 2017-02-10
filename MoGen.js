"use strict";
var MoGen = (function(){
//module.exports = (function(){
    /**
     * Concatenates a string with another string based on the condition that the first string is empty or not.
     * If the first is empty, it returns empty (without concatening)
     * If the first is not empty, it returns the concatenation of both
     * @param {string} value string to validate its contents, it decides if it will be a concatenation
     * @param {string} string_to_concatenate string to be concatenated if the condition meets
     * @return {string} a concatenated string of empty or of both strings
     */
    var concat = function(value,string_to_concatenate){
        if (value === ""){
            return "";
        } else {
            return value + string_to_concatenate;
        }
    };
    /**
     * Obtains the maximum value of a property in an array and returns that value.
     * @param {array} arr the collection to be revised to find the maximum value
     * @param {string} propertyName the property to be analised to find the maximum value
     * @return {integer} the maximum value found on the collection
     */
    var Array_MaximumElementByProperty = function(arr,propertyName){
        var maxValue = 0;
        for (var i=0 ; i<arr.length ; i++){
            if (arr[i][propertyName]){
                maxValue = arr[i][propertyName] > maxValue ? arr[i][propertyName] : maxValue;
            }
        }
        return maxValue;
    };

    return {
        concat: concat
        , Array_MaximumElementByProperty: Array_MaximumElementByProperty
    };
})();
module.exports = MoGen;