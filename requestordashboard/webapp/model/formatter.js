sap.ui.define(["sap/ui/core/format/DateFormat",
    "sap/ui/core/format/NumberFormat"
],

    function (DateFormat, NumberFormat) {
        "use strict";
        return {
            formatDate:function (dateString) {
                if (!dateString) {
                    return null;
                }
                
                if( dateString !== null){
                const date = new Date(dateString);
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                return date.toLocaleDateString('en-US', options);
                }
              },
            formatCurrency: function (amount, currencyCode) {
                if (!amount || !currencyCode) {
                    return "";
                }
                var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                    currencyCode: false,
                    showMeasure: false
                });
                return oCurrencyFormat.format(amount, currencyCode);
            },
            convDate: function (dateString) {
                if (!dateString) {
                    return null;
                }
                const date = new Date(dateString); // Or any other Date object
 
                // Format for a specific locale (e.g., US English)
                var ODateFormat = DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });
                var finalDate = ODateFormat.format(date);
                console.log(finalDate);
                return finalDate;
            },
            dateFormatISO: function (dateString) {
                if (!dateString) {
                    return null;
                }
                const date = new Date(dateString); // Or any other Date object
 
                // Format for a specific locale (e.g., US English)
                var ODateFormat = DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd'T'HH:mm:ss"
                });
                var finalDate = ODateFormat.format(date);
                console.log(finalDate);
                return finalDate;
            }

        };
    }
);