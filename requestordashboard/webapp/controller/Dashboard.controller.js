sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/sap/cc/requestordashboard/model/formatter",
    "sap/ui/core/library",
    "sap/ui/model/Sorter",

], (Controller, MessageToast, MessageBox, Filter, FilterOperator, formatter, CoreLibrary,Sorter) => {
    "use strict";
    var oRequestorObject;
    var ValueState = CoreLibrary.ValueState; 

    return Controller.extend("com.sap.cc.requestordashboard.controller.Dashboard", {

        formatter: formatter,
        onInit() {
            oRequestorObject = this;
            oRequestorObject.oResourceBundle = oRequestorObject.getOwnerComponent().getModel("i18n").getResourceBundle();
            
            //Get API data
            oRequestorObject.getWorkflowData();
        },

        //Navigation to Tile view(Home)
        onNavBack: function () {
           var hostName = "https://" + window.location.hostname + "/site#Shell-home?sap-app-origin-hint=";

            if (window !== window.top) {
                window.top.location.href = hostName;
            }
            
        },

        onAfterRendering: function () {
            var oDateSel = this.getView().byId("DRS1");
            $("#" + oDateSel.sId + " input").prop("readonly", true);
            oDateSel.addEventDelegate({
                onAfterRendering: function () {
                    var oDateInner = this.$().find('.sapMInputBaseInner');
                    var oID = oDateInner[0].id;
                    $('#' + oID).attr("disabled", "disabled");
                }
            }, oDateSel);

            var oDateSel = this.getView().byId("DRS2");
            $("#" + oDateSel.sId + " input").prop("readonly", true);
            oDateSel.addEventDelegate({
                onAfterRendering: function () {
                    var oDateInner = this.$().find('.sapMInputBaseInner');
                    var oID = oDateInner[0].id;
                    $('#' + oID).attr("disabled", "disabled");
                }
            }, oDateSel);
        },

        //Get API call
        getWorkflowData: function () {
            
            var sUserEmail = sap.ushell.Container.getUser().getEmail();
            var sUrl = oRequestorObject._getBaseURL() + "/nokiaBTP/InboundBTPStandaloneWorkflow?$filter=requestorId eq '" + sUserEmail + "'";
            console.log("Logged-in user ID:", sUserEmail);
            var oTable = oRequestorObject.byId("workflowTable");
            oTable.setBusy(true);
            
            jQuery.get({

                url: sUrl,

                headers: {
                    "ContentType": 'application/json',
                    "Accept": 'application/json',
                    "cache": false,
                    'X-CSRF-Token': 'Fetch'
                },
                success: function (aResults) {
                   
                    if (aResults && aResults.length !== 0) {

                        console.log("API Results:", aResults);
                        var oModel = new sap.ui.model.json.JSONModel({
                            requestorData: aResults
                        });
                        console.log("Requestor Data:", oModel.getProperty("/requestorData"));
                        oRequestorObject.getView().setModel(oModel, "oRequestorModel");
                        sap.ui.getCore().setModel(oModel, "oRequestorModel");
                        oRequestorObject.statusComboBoxData();
                        oTable.setBusy(false);
                    }
                    else {
                        oTable.setBusy(false);
                        MessageBox.information("No data available")
                    }
                },
                error: function (xhr, status, error) {
                    oTable.setBusy(false);
                    MessageBox.error("Service Unavailable!");
                    console.error("Error getting Data", error);

                }
            });
        },

        //Clear function
        onClear: function () {

            oRequestorObject.getView().byId("subjectValueHelp").setValue("");
            oRequestorObject.getView().byId("cpoNumberValueHelp").setValue("");
            oRequestorObject.getView().byId("salesOrderValueHelp").setValue("");
            oRequestorObject.getView().byId("assigneeValueHelp").removeAllTokens();
            oRequestorObject.getView().byId("businessGroupValueHelp").setValue("");
            oRequestorObject.getView().byId("statusComboBox").setSelectedKeys();
            oRequestorObject.getView().byId("DRS1").setDateValue(null);
            oRequestorObject.getView().byId("DRS1").setSecondDateValue(null);
            oRequestorObject.getView().byId("DRS2").setDateValue(null);
            oRequestorObject.getView().byId("DRS2").setSecondDateValue(null);
        },

        //Function for clear button in filterbar
        onClearFilterBar: function () {
            var oTable = this.getView().byId("workflowTable");
            var oBinding = oTable.getBinding("items"),
                aFilters = [];
            oRequestorObject.getView().byId("subjectValueHelp").setValue("");
            oRequestorObject.getView().byId("cpoNumberValueHelp").setValue("");
            oRequestorObject.getView().byId("salesOrderValueHelp").setValue("");
            oRequestorObject.getView().byId("assigneeValueHelp").removeAllTokens();
            oRequestorObject.getView().byId("businessGroupValueHelp").setValue("");
            oRequestorObject.getView().byId("statusComboBox").setSelectedKeys();
            oRequestorObject.getView().byId("DRS1").setDateValue(null);
            oRequestorObject.getView().byId("DRS1").setSecondDateValue(null);
            oRequestorObject.getView().byId("DRS2").setDateValue(null);
            oRequestorObject.getView().byId("DRS2").setSecondDateValue(null);
            oBinding.filter(aFilters);
        },

        handleChange: function (oEvent) {
            var bValid = oEvent.getParameter("valid"),
                oEventSource = oEvent.getSource();
            if (bValid) {
                oEventSource.setValueState(ValueState.None);
            } else {
                oEventSource.setValueState(ValueState.Error);
            }
        },

        //Navigate when task is clicked in table
        onRequestPress: function (oEvent) {
            // Get selected request
            var oRequest = oEvent.getParameter("listItem");

            if (!oRequest) {
                console.log("Request Items are not fetched")
            }

            // Get the binding context
            var oContext = oRequest.getBindingContext("oRequestorModel");

            if (!oContext) {
                console.log("Binding context is not defined");
                return;
            }

            // Get the request Num (or pass entire path)
            var sRequestNum = oContext.getProperty("rootInstanceId");

            console.log("Clicked Request Number:", sRequestNum);

            // Navigate to the detail view with root instance ID as a route parameter
            oRequestorObject.getOwnerComponent().getRouter().navTo("RouteObject", {
                Num: sRequestNum
            });

            oRequestorObject.onClear();
            oRequestorObject.onClearFilterBar();

        },

        _getWorkflowRuntimeBaseURL: function () {
            var appId = oRequestorObject.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);

            return appModulePath + "/OO_SBPA_admin/v1";

        },
        _getBaseURL: function () {
            var appId = oRequestorObject.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath + "/OO_CommerCloud_Destination_Flat";

        },

        _fetchToken: function () {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/workflow-instances",
                    method: "GET",
                    headers: {
                        "X-CSRF-Token": "Fetch"
                    },
                    success: function (res, status, xhr) {
                        var sToken = xhr.getResponseHeader("X-CSRF-Token");
                        if (sToken) {
                            resolve(sToken);
                        } else {
                            reject("No CSRF token found");
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("CSRF token fetch failed:", error);
                        reject(error);
                    }
                });
            });
        },

        // Promise code for 202 Patch call
        toPromise: function (jqXHR) {
            return new Promise(function (resolve, reject) {
                jqXHR.always(function (dataXhr, textStatus, Xhr) {
                    var xhr = Xhr && Xhr.status ? Xhr : dataXhr;
                    var status = xhr.status;

                    if (status === 204) {
                        resolve({ status: 204, data: dataXhr });
                    } else {
                        reject({ status: status, data: dataXhr });
                    }
                });
            });
        },

        //Patch call to set status as "Completed".
        onCompleteTask: function () {
            var oTable = oRequestorObject.byId("workflowTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (!aSelectedItems.length) {
                MessageBox.error("Please select at least one workflow to cancel.");
                return;
            }

            var aItems = [];
            for (var i = 0; i < aSelectedItems.length; i++) {
                var oItem = aSelectedItems[i];
                var oContext = oItem.getBindingContext("oRequestorModel");
                var oTaskData = oContext.getObject();
                var sStatus = oTaskData.status;

                if (sStatus === "Completed") {
                    MessageBox.error("One or more selected workflows are already completed.");
                    return;
                }

                if (sStatus === "Assigned" || sStatus === "Ready to Review") {
                    aItems.push(oItem);
                }
            }

            if (!aItems.length) {
                MessageBox.warning("No assigned workflows found to cancel.");
                return;
            }

            oTable.setBusy(true);

            oRequestorObject._fetchToken().then(function (sToken) {
                var aCalls = [];
                var sloggedUser = sap.ushell.Container.getUser().getEmail();
                var callCount = 0;

                aItems.forEach(function (oItem) {
                    var oContext = oItem.getBindingContext("oRequestorModel");
                    var oTaskData = oContext.getObject();
                    var sWorkflowInstanceId = oTaskData.rootInstanceId;
                    var assignee = oTaskData.assigneeEmailId;

                    var oErrorMsg = "";
                    $.ajax({
                        url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances?status=READY&status=RESERVED&$top=1&workflowInstanceId=" + sWorkflowInstanceId,
                        method: "GET",
                        contentType: "application/json",
                        success: function (oData) {
                            if (oData.length === 0) {
                                callCount++;
                                if (callCount === aItems.length) {
                                    finalizeMessage(aCalls, oTable,oErrorMsg);
                                }
                                return;
                            }

                            var sTaskId = oData[0].id;
                            var sStatus = oData[0].status;
                            var sProcessor = oData[0].processor;

                            if (sStatus === "RESERVED") {
                                oTable.setBusy(false);
                                MessageBox.error("This task has already been claimed by " + sProcessor + ".");
                                
                                return;
                            }
                            var oPayload = {
                                status: "COMPLETED",
                                decision: "cancel",
                                context: {
                                    "comments": "Completed by Requestor",
                                    "assignee": assignee,
                                    "user": sloggedUser,
                                    "role": "Requestor",
                                    "leadingDocumentName": "",
                                    "leadingDocumentInstanceId": ""
                                }
                            };

                            var oCall = $.ajax({
                                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances/" + sTaskId,
                                method: "PATCH",
                                contentType: "application/json",
                                async: true,
                                data: JSON.stringify(oPayload),
                                headers: {
                                    "X-CSRF-Token": sToken,
                                },
                                success: function () {
                                    aCalls.push(oRequestorObject.toPromise(oCall));
                                    callCount++;
                                    if (callCount === aItems.length) {
                                        finalizeMessage(aCalls, oTable, oErrorMsg);
                                    }

                                },
                                error: function (oErr) {
                                    oErrorMsg = oErr.responseJSON.error.message;
                                    aCalls.push(oRequestorObject.toPromise(oCall));
                                    callCount++;
                                    if (callCount === aItems.length) {
                                        finalizeMessage(aCalls, oTable, oErrorMsg);
                                    }
                                }
                            });

                        },
                        error: function (xhr) {
                            callCount++;
                            if (callCount === aItems.length) {
                                finalizeMessage(aCalls, oTable,oErrorMsg);
                            }
                            console.error("Failed to load task instances", xhr.responseText);
                        }
                    });
                });
            }).catch(function () {
                oTable.setBusy(false);
                MessageBox.error("Failed to fetch CSRF token.");
            });

            function finalizeMessage(aCalls, oTable,oErrorMsg) {
                Promise.allSettled(aCalls).then(function (results) {
                    var successCount = results.filter(function (res) {
                        return res.status === "fulfilled" && res.value && res.value.status === 204;
                    }).length;
                    var failureCount = results.length - successCount;

                    oTable.setBusy(false);

                    if (successCount === 0) {
                        MessageBox.error("Workflow completion failed: " + oErrorMsg + " \nSelect valid workflow instance(s).");
                        oRequestorObject.onClearFilterBar();
                    } else if (failureCount === 0) {
                        MessageBox.success("Workflows completed successfully.");
                        oRequestorObject.getWorkflowData();
                        oRequestorObject.onClearFilterBar();
                    } else {
                        MessageBox.warning("Some workflows failed. Check the selection and try again.");
                        oRequestorObject.getWorkflowData();
                        oRequestorObject.onClearFilterBar();
                    }
                });
            }
        },

        onSelectionChange: function (oEvent) {
            var oTable = oRequestorObject.byId("workflowTable");
            var aSelectedItems = oTable.getSelectedItems();

            var oText = oRequestorObject.byId("selectedItemsText");

            if (aSelectedItems.length > 0) {
                oText.setText("Selected Items: " + aSelectedItems.length);
            } else {
                oText.setText("Selected Items: None");
            }
        },

         //Status MultiCombobox
        statusComboBoxData: function () {
            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            // Get the data from the model
            const aRawData = oProductModel.getProperty("/requestorData") || [];

            // Deduplicate ID
            const oSeen = new Set();
            const aUniqueID = [];

            aRawData.forEach(oItem => {
                const sType = oItem.status;
                if (sType && !oSeen.has(sType)) {
                    oSeen.add(sType);
                    aUniqueID.push({ status: sType });
                }
            });

            // Step 3: Create JSONModel with unique values

            var oStatusModel = new sap.ui.model.json.JSONModel();
            oStatusModel.setData({ status: aUniqueID });
            oRequestorObject.getView().setModel(oStatusModel, "oStatusModel");
        },

        // F4 Helps in filterbar
        onSubjectValueHelpRequest: function () {

            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            // Get the data from the model
            const aRawData = oProductModel.getProperty("/requestorData") || [];

            // Deduplicate ID
            const oSeen = new Set();
            const aUniqueID = [];

            aRawData.forEach(oItem => {
                const sType = oItem.subjectLine;
                if (sType && !oSeen.has(sType)) {
                    oSeen.add(sType);
                    aUniqueID.push({ subjectLine: sType });
                }
            });

            // Step 3: Create JSONModel with unique values
            const oSubjectModel = new sap.ui.model.json.JSONModel({ subjectLine: aUniqueID });

            // Step 4: Lazy load dialog
            if (!oRequestorObject.oSubjectModel) {
                oRequestorObject.oSubjectModel = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.subjectValueHelp", oRequestorObject);
                oRequestorObject.getView().addDependent(oRequestorObject.oSubjectModel);
            }

            // Step 5: Set model and open dialog
            oRequestorObject.oSubjectModel.setModel(oSubjectModel, "oSubjectModel");
            oRequestorObject.oSubjectModel.open();


        },

        onCpoNumberValueHelpRequest: function () {

            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            // Get the data from the model
            const aRawData = oProductModel.getProperty("/requestorData") || [];

            // Deduplicate ID
            const oSeen = new Set();
            const aUniqueID = [];

            aRawData.forEach(oItem => {
                const sType = oItem.cpoNumber;
                if (sType && !oSeen.has(sType)) {
                    oSeen.add(sType);
                    aUniqueID.push({ cpoNumber: sType });
                }
            });

            // Step 3: Create JSONModel with unique values
            const oCpoNumModel = new sap.ui.model.json.JSONModel({ cpoNumber: aUniqueID });

            // Step 4: Lazy load dialog
            if (!oRequestorObject.oCpoNumModel) {
                oRequestorObject.oCpoNumModel = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.cpoNumValueHelp", oRequestorObject);
                oRequestorObject.getView().addDependent(oRequestorObject.oCpoNumModel);
            }

            // Step 5: Set model and open dialog
            oRequestorObject.oCpoNumModel.setModel(oCpoNumModel, "oCpoNumModel");
            oRequestorObject.oCpoNumModel.open();
        },

        onSalesOrderValueHelpRequest: function () {

            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            // Get the data from the model
            const aRawData = oProductModel.getProperty("/requestorData") || [];

            // Deduplicate ID
            const oSeen = new Set();
            const aUniqueID = [];

            aRawData.forEach(oItem => {
                const sType = oItem.salesOrderNumber;
                if (sType && !oSeen.has(sType)) {
                    oSeen.add(sType);
                    aUniqueID.push({ salesOrderNumber: sType });
                }
            });

            // Step 3: Create JSONModel with unique values
            const oSalesOrderModel = new sap.ui.model.json.JSONModel({ salesOrderNumber: aUniqueID });

            // Step 4: Lazy load dialog
            if (!oRequestorObject.oSalesOrderModel) {
                oRequestorObject.oSalesOrderModel = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.salesOrderValueHelp", oRequestorObject);
                oRequestorObject.getView().addDependent(oRequestorObject.oSalesOrderModel);
            }

            // Step 5: Set model and open dialog
            oRequestorObject.oSalesOrderModel.setModel(oSalesOrderModel, "oSalesOrderModel");
            oRequestorObject.oSalesOrderModel.open();
        },

        onAssigneeValueHelpRequest: function () {

            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            const aRawData = oProductModel.getProperty("/requestorData") || [];

            const oSeen = new Set(); // Declare this before the loop
            const aUniqueEmails = [];

            aRawData.forEach(oItem => {
                const sType = oItem.assigneeEmailId;

                if (sType) {
                    const aSplitTypes = sType.split(",").map(s => s.trim()); // Split by comma

                    aSplitTypes.forEach(sVal => {
                        if (sVal && !oSeen.has(sVal)) {
                            oSeen.add(sVal);
                            aUniqueEmails.push({ assigneeEmailId: sVal });
                        }
                    });
                }
            });
            // Step 3: Create JSONModel with unique values
            const oAssigneeModel = new sap.ui.model.json.JSONModel({ assignee: aUniqueEmails });

            // Step 4: Lazy load dialog
            if (!oRequestorObject.oAssigneeModel) {
                oRequestorObject.oAssigneeModel = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.assigneeValueHelp", oRequestorObject);
                oRequestorObject.getView().addDependent(oRequestorObject.oAssigneeModel);
            }

            // Step 5: Set model and open dialog
            oRequestorObject.oAssigneeModel.setModel(oAssigneeModel, "oAssigneeModel");
            oRequestorObject.oAssigneeModel.open();
        },

        onBusinessGroupValueHelpRequest: function () {

            const oView = oRequestorObject.getView();
            const oProductModel = oView.getModel("oRequestorModel");

            // Get the data from the model
            const aRawData = oProductModel.getProperty("/requestorData") || [];

            // Deduplicate ID
            const oSeen = new Set();
            const aUniqueID = [];

            aRawData.forEach(oItem => {
                const sType = oItem.businessGroup;
                if (sType && !oSeen.has(sType)) {
                    oSeen.add(sType);
                    aUniqueID.push({ businessGroup: sType });
                }
            });

            // Step 3: Create JSONModel with unique values
            const oBusinessGroupModel = new sap.ui.model.json.JSONModel({ businessGroup: aUniqueID });

            // Step 4: Lazy load dialog
            if (!oRequestorObject.oBusinessGroupModel) {
                oRequestorObject.oBusinessGroupModel = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.businessGroupValueHelp", oRequestorObject);
                oRequestorObject.getView().addDependent(oRequestorObject.oBusinessGroupModel);
            }

            // Step 5: Set model and open dialog
            oRequestorObject.oBusinessGroupModel.setModel(oBusinessGroupModel, "oBusinessGroupModel");
            oRequestorObject.oBusinessGroupModel.open();
        },

        // Value Help search
        onValueHelpSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("value"),
                sTitle = oEvent.getSource().getTitle();
            switch (sTitle) {
                case oRequestorObject.oResourceBundle.getText("subject"):
                    var oFilter = new Filter("subjectLine", FilterOperator.Contains, sQuery);
                    break;
                case oRequestorObject.oResourceBundle.getText("cpoNumber"):
                    var oFilter = new Filter("cpoNumber", FilterOperator.Contains, sQuery);
                    break;
                case oRequestorObject.oResourceBundle.getText("salesOrderNumber"):
                    var oFilter = new Filter("salesOrderNumber", FilterOperator.Contains, sQuery);
                    break;
                case oRequestorObject.oResourceBundle.getText("assignee"):
                    var oFilter = new Filter("assigneeEmailId", FilterOperator.Contains, sQuery);
                    break;
                // case oRequestorObject.oResourceBundle.getText("status"):
                //     var oFilter = new Filter("status", FilterOperator.Contains, sQuery);
                //     break;
                case oRequestorObject.oResourceBundle.getText("businessGroup"):
                    var oFilter = new Filter("businessGroup", FilterOperator.Contains, sQuery);
                    break;
            }
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        // Value Help Close
        onValueHelpClose: function (oEvent) {
            var sTitle = oEvent.getSource().getTitle();
            var oSelectedItem = oEvent.getParameter("selectedItem");
            switch (sTitle) {
                case oRequestorObject.oResourceBundle.getText("subject"):
                    if (oSelectedItem) {
                        oRequestorObject.byId("subjectValueHelp").setValue(oSelectedItem.getTitle());
                    }
                    break;
                case oRequestorObject.oResourceBundle.getText("cpoNumber"):
                    if (oSelectedItem) {
                        oRequestorObject.byId("cpoNumberValueHelp").setValue(oSelectedItem.getTitle());
                    }
                    break;
                case oRequestorObject.oResourceBundle.getText("salesOrderNumber"):
                    if (oSelectedItem) {
                        oRequestorObject.byId("salesOrderValueHelp").setValue(oSelectedItem.getTitle());
                    }
                    break;
                case oRequestorObject.oResourceBundle.getText("businessGroup"):
                    if (oSelectedItem) {
                        oRequestorObject.byId("businessGroupValueHelp").setValue(oSelectedItem.getTitle());
                    }
                    break;
                case oRequestorObject.oResourceBundle.getText("assignee"):
                    var aContexts = oEvent.getParameter("selectedContexts");
                    var oMultiInput = oRequestorObject.getView().byId("assigneeValueHelp");

                    if (aContexts && aContexts.length) {
                        aContexts.forEach(function (oContext) {
                            var sSlectedAssignee = oContext.getObject().assigneeEmailId;
                            if (sSlectedAssignee) {
                                oMultiInput.addToken(new sap.m.Token({
                                    key: sSlectedAssignee,
                                    text: sSlectedAssignee,
                                }));
                            }
                        });
                        var sSlectedAssignee = aContexts.map(oContext => oContext.getObject().assigneeEmailId).join(", ");
                        MessageToast.show("You have chosen " + sSlectedAssignee);
                    }
                    else {
                        MessageToast.show("No new item was selected.");
                    }
                    // Clear filters
                    oEvent.getSource().getBinding("items").filter([]);
                    break;
            }
        },

        // Filterbar search 
        onSearch: function (oEvent) {
            var oTable = oRequestorObject.getView().byId("workflowTable");
            var oBinding = oTable.getBinding("items");
            var sSubject = oRequestorObject.getView().byId("subjectValueHelp").getValue();
            var sCpoNum = oRequestorObject.getView().byId("cpoNumberValueHelp").getValue();
            var sSalesOrder = oRequestorObject.getView().byId("salesOrderValueHelp").getValue();
            var assigneeValueHelp = oRequestorObject.getView().byId("assigneeValueHelp");
            var sAssignee = assigneeValueHelp.getTokens();
            var sBusinessGroup = oRequestorObject.getView().byId("businessGroupValueHelp").getValue();
            var statusComboBox = oRequestorObject.getView().byId("statusComboBox");
            var sStatus = statusComboBox.getSelectedKeys();
            var oDateRange = this.getView().byId("DRS1");
            var creationStartDate = formatter.dateFormatISO(oDateRange.getDateValue());
            var creationEndDate = formatter.dateFormatISO(oDateRange.getSecondDateValue());
            var oDateRange = this.getView().byId("DRS2");
            var completionStartDate = formatter.dateFormatISO(oDateRange.getDateValue());
            var completionEndDate = formatter.dateFormatISO(oDateRange.getSecondDateValue());
            var aFilters = [];

            if (sSubject) {
                aFilters.push(new sap.ui.model.Filter("subjectLine", sap.ui.model.FilterOperator.Contains, sSubject));
            }
            if (sCpoNum) {
                aFilters.push(new sap.ui.model.Filter("cpoNumber", FilterOperator.Contains, sCpoNum));
            }
            if (sSalesOrder) {
                aFilters.push(new sap.ui.model.Filter("salesOrderNumber", FilterOperator.Contains, sSalesOrder));
            }
            if (sAssignee && sAssignee.length) {
                var aAssigneeFilters = sAssignee.map(function (oToken) {
                    return new sap.ui.model.Filter("assigneeEmailId", FilterOperator.Contains, oToken.getText());
                });

                aFilters.push(new sap.ui.model.Filter({
                    filters: aAssigneeFilters,
                    and: false
                }));
            }
            if (sBusinessGroup) {
                aFilters.push(new sap.ui.model.Filter("businessGroup", FilterOperator.Contains, sBusinessGroup));
            }
            //New code
            if (sStatus.length) {
                var aStatusFilters = sStatus.map(function (sKey) {
                    return new sap.ui.model.Filter("status", FilterOperator.Contains, sKey);
                });

                aFilters.push(new sap.ui.model.Filter({
                    filters: aStatusFilters,
                    and: false
                }));
            }
            if (creationStartDate && creationEndDate) {
                aFilters.push(new sap.ui.model.Filter("creationDate", sap.ui.model.FilterOperator.BT, creationStartDate, creationEndDate));
            }

            if (completionStartDate && completionEndDate) {
                aFilters.push(new sap.ui.model.Filter("completionDate", sap.ui.model.FilterOperator.BT, completionStartDate, completionEndDate));
            }

            oBinding.filter(aFilters);
            console.log(aFilters);
        },

        // Adding input as token in F4 Helps
        onChangeAssignee: function (oEvent) {
            var sValue = oEvent.getSource().getValue().trim();
            if (sValue) {
                this._addCustomAssigneeToken(sValue);
                oEvent.getSource().setValue("");
            }
        },

        _addCustomAssigneeToken: function (sText) {
            var oAssignee = this.byId("assigneeValueHelp");
            if (!sText || !oAssignee) return;

            var bExists = oAssignee.getTokens().some(function (t) {
                return t.getText() === sText;
            });
            if (bExists) return;

            var oToken = new sap.m.Token({
                text: sText,
                key: sText
            });
            oAssignee.addToken(oToken);
        },
        
        //Settings button in Filterbar
        openSettings: function () {
            if (!this.Settings) {
                this.Settings = this.loadFragment({
                    name: "com.sap.cc.requestordashboard.fragments.settings",
                    controller: this
                });
            }
            this.Settings.then(function (oDialog) {
                oDialog.open();
            });
        },
        applySettings: function (oEvt) {
            var sortItem = oEvt.getParameter("sortItem"),
                groupItem = oEvt.getParameter("groupItem"),
                sortDesc = oEvt.getParameter("sortDescending"),
                groupDesc = oEvt.getParameter("groupDescending"),
                oTable = this.byId("workflowTable"),
                oBinding = oTable.getBinding("items"),
                oSorter = null;
            if (sortItem) {
                oSorter = new Sorter(sortItem.getKey(), sortDesc);
            }

            if (groupItem) {
                oSorter = new Sorter(groupItem.getKey(), groupDesc, true);
            }

            if (sortItem == undefined) {
                oSorter = new Sorter("creationDate", true);
            }
            oBinding.sort(oSorter);
        },

    });
});