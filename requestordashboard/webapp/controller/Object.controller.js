sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "sap/m/MessageBox",
    "sap/ui/core/CustomData",
    "sap/ui/commons/FileUploaderParameter",
    "sap/m/library",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/json/JSONModel",
    "com/sap/cc/requestordashboard/model/formatter",

], (Controller, MessageToast, coreLibrary, MessageBox, CustomData, FileUploaderParameter, library, DateFormat, JSONModel, formatter) => {
    "use strict";

    var oRequestorObject;
    var oFolderID, oFolderName, itemIndex, oFlag;
    var token;
    var URLHelper = library.URLHelper;


    return Controller.extend("com.sap.cc.requestordashboard.controller.Object", {
        formatter: formatter,
        onInit() {
            oRequestorObject = this;
            //file upload initialization
            oRequestorObject.getView().byId("fileUploader").setUploadUrl("./docservice/root");
            oRequestorObject.getView().byId("fileUploader").setSendXHR(true);
            oRequestorObject.getView().byId("fileUploader").setUseMultipart(true);

            // document service interaction
            var oAttachmentsModel = new JSONModel();
            oRequestorObject.getView().setModel(oAttachmentsModel, "attachmentsModel");

            oRequestorObject.oResourceBundle = oRequestorObject.getOwnerComponent().getModel("i18n").getResourceBundle();

            var oTaskDataModel = sap.ui.getCore().getModel("oRequestorModel");

            oRequestorObject.getView().setModel(oTaskDataModel, "oTaskDataModel");
            var oRouter = sap.ui.core.UIComponent.getRouterFor(oRequestorObject);
            oRouter.getRoute("RouteObject").attachPatternMatched(oRequestorObject._onRequestMatched, oRequestorObject);

            oRequestorObject._CommentDialog = null;

            oRequestorObject.getOwnerComponent().getService("ShellUIService").then(function (oShellService) {
                oShellService.setBackNavigation(function (oEvent) {
                    if (oFlag !== null && oFlag !== undefined) {
                        oRequestorObject.onCancel();
                    }
                    else {
                        oRequestorObject.onNavBack();
                    }
                });
            });

        },

        //Navigate to Tile view(Home)
        onNavBack: function () {
            var hostName = "https://" + window.location.hostname + "/site#Shell-home?sap-app-origin-hint=";

            if (window !== window.top) {
                window.top.location.href = hostName;
            }

        },

        //Data binding after navigation based on selected workflow item
        _onRequestMatched: function (oEvent) {
            oRequestorObject.getView().setBusy(true);
            var sRequestNum = oEvent.getParameter("arguments").Num;
            var oTableDataModel = oRequestorObject.getView().getModel("oTaskDataModel");
            if (oTableDataModel === undefined) {
                oRequestorObject.getView().setBusy(false);
                MessageBox.error(oRequestorObject.oResourceBundle.getText("objNavRefresh"), {
                    onClose: function () {
                        oRequestorObject.onNavBack();
                    }
                });

            }
            else {
                var aData = oTableDataModel.getProperty("/requestorData");
                oRequestorObject.getView().setModel(oTableDataModel, "oTableDataModel");

                var iIndex = aData.findIndex(function (item) {
                    return item.rootInstanceId === sRequestNum;
                });

                if (iIndex > -1) {
                    var sPath = "/requestorData/" + iIndex;
                    oRequestorObject.getView().bindElement({
                        path: sPath,
                        model: "oTableDataModel"
                    });

                    itemIndex = iIndex;
                    var oWorkflowModel = oRequestorObject.getView().getModel("oTableDataModel");
                    var rootId = oWorkflowModel.getProperty("/requestorData/" + iIndex + "/rootInstanceId")
                    var sUserEmail = oWorkflowModel.getProperty("/requestorData/" + iIndex + "/assigneeEmailId")
                    var sStatus = oWorkflowModel.getProperty("/requestorData/" + iIndex + "/status")
                    console.log(rootId);
                    oRequestorObject.getAttachments(iIndex);
                    oRequestorObject.getClaimData(rootId);
                    var oReassignModel = new sap.ui.model.json.JSONModel({
                        rootId: rootId,
                        sUserEmail: sUserEmail
                    });
                    oRequestorObject.getView().setModel(oReassignModel, "oWorkflowModel");

                    // History Binding
                    var aHistory = oWorkflowModel.getProperty("/requestorData/" + iIndex + "/history") || [];
                    var oHistoryModel = new sap.ui.model.json.JSONModel(aHistory);
                    oRequestorObject.getView().setModel(oHistoryModel, "oHistoryModel");
                    oRequestorObject.getView().setBusy(false);

                    //Button disable 
                    console.log("Fetched status:", sStatus);

                    if (sStatus.trim().toLowerCase() === "completed") {
                        oRequestorObject.getView().byId("sendReminderBtn").setEnabled(false);
                        oRequestorObject.getView().byId("reassignEmail").setEnabled(false);
                        oRequestorObject.getView().byId("fileUploader").setEnabled(false);
                        oRequestorObject.getView().byId("idUploadList").setMode("None");
                    } else {
                        oRequestorObject.getView().byId("sendReminderBtn").setEnabled(true);
                        oRequestorObject.getView().byId("reassignEmail").setEnabled(true);
                        oRequestorObject.getView().byId("fileUploader").setEnabled(true);
                        oRequestorObject.getView().byId("idUploadList").setMode("Delete");
                    }
                }
                else {
                    sap.m.MessageBox.error("Item not found");
                    oRequestorObject.getView().setBusy(false);
                }
                oFlag = "x";
            }
            oRequestorObject.onClear();
        },

        onAfterRendering: function () {

            oRequestorObject._originalComment = oRequestorObject.byId("commentsSection").getValue();

        },

        getClaimData: function (rootId) {

            $.ajax({
                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances?status=READY&status=RESERVED&$top=1&workflowInstanceId=" + rootId,
                method: "GET",
                contentType: "application/json",
                success: function (oData) {
                    console.log(oData);

                    var sProcessor = oData[0].processor || "";
                    var sStatus = oData[0].status || "";

                    if (sStatus === "RESERVED") {
                        oRequestorObject.getView().byId("fileUploader").setEnabled(false);
                        oRequestorObject.getView().byId("idUploadList").setMode("None");
                    }

                    var oClaimModel = new sap.ui.model.json.JSONModel({
                        claimedBy: sProcessor,
                        status: sStatus
                    });

                    oRequestorObject.getView().setModel(oClaimModel, "oClaimModel");

                    console.log("Processor:", sProcessor, "Status:", sStatus);

                },
            });
            return;
        },


        //Back button function in footer
        onCancel: function () {
            var oUploadCollection = oRequestorObject.byId("idUploadList");
            var currentItems = oUploadCollection.getItems();
            var currentCount = currentItems.length;

            if (currentCount !== oRequestorObject._initialAttachmentCount) {
                oFlag = null;
                if (!oRequestorObject._CommentDialog) {
                    oRequestorObject._CommentDialog = sap.ui.xmlfragment("com.sap.cc.requestordashboard.fragments.commentsDialog", oRequestorObject);
                    oRequestorObject.getView().addDependent(oRequestorObject._CommentDialog);
                }

                sap.ui.getCore().byId("commentInput").setValue("");

                oRequestorObject._CommentDialog.open();
            } else {
                oRequestorObject._navigateBack();
            }
        },

        onConfirmComment: function () {
            var oTextArea = sap.ui.getCore().byId("commentInput")
            var sComments = oTextArea.getValue().trim();

            if (!sComments) {
                sap.m.MessageToast.show("Please enter comments before proceeding.");
                return;
            }

            oRequestorObject._CommentDialog.close();

            oRequestorObject._onNewAttachments(sComments)

        },

        //Clear function for comment section
        onCancelComment: function () {
            sap.ui.getCore().byId("commentInput").setValue("");
            oRequestorObject._CommentDialog.close();
        },

        //New attachment patch call
        _onNewAttachments: function (sComments) {
            var oView = oRequestorObject.getView(); // Get the view
            oView.setBusy(true);
            var oNewAttachModel = oView.getModel("oWorkflowModel");
            var oWFID = oNewAttachModel.getProperty("/rootId");
            var sUserEmail = oNewAttachModel.getProperty("/sUserEmail");
            var leadDocName = oRequestorObject.getView().getModel("oTableDataModel").getProperty("/requestorData/" + itemIndex + "/leadingDocumentName");
            var sloggedUser = sap.ushell.Container.getUser().getEmail();
            var sAttachCount = String(oView.getModel("oTableDataModel").getProperty("/AttachCount"));

            console.log("Workflow Instance ID :" + oWFID);
            console.log("Workflow Instance ID :" + sUserEmail);

            var oErrorMsg = "";
            $.ajax({
                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances?status=READY&status=RESERVED&$top=1&workflowInstanceId=" + oWFID,
                method: "GET",
                contentType: "application/json",
                success: function (oData) {
                    var aTasks = oData;

                    if (aTasks.length === 0) {
                        oView.setBusy(false);
                        MessageBox.error("No task available");
                        return;
                    }

                    var sTaskId = aTasks[0].id;
                    var sStatus = aTasks[0].status;
                    var sProcessor = aTasks[0].processor;

                    if (sStatus === "RESERVED") {
                        oView.setBusy(false);
                        MessageBox.error("This task has already been claimed by " + sProcessor + ".");
                        return;
                    }

                    var sToken = oRequestorObject._fetchToken();

                    if (!sToken) {
                        oView.setBusy(false);
                        MessageBox.error("Failed to fetch CSRF token.");
                        return;
                    }
                    var payload = {
                        status: "COMPLETED",
                        decision: "attachments",
                        context: {
                            "comments": sComments,
                            "assignee": "",
                            "role": "Requestor",
                            "user": sloggedUser,
                            "leadingDocumentName": leadDocName || "",
                            "leadingDocumentInstanceId": "",
                            "AttachCount": sAttachCount
                        },
                    };

                    $.ajax({
                        url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances/" + sTaskId,
                        method: "PATCH",
                        headers: {
                            "X-CSRF-Token": sToken,
                            "Content-Type": "application/json"
                        },
                        data: JSON.stringify(payload),
                        success: function (oData) {
                            oView.setBusy(false);
                            console.log("oData" + oData);
                            console.log("Attachment patch call successfull.");
                            sap.m.MessageBox.success("Changes saved successfully", {
                                onClose: function () {
                                    oRequestorObject._navigateBack();
                                }
                            });


                        },
                        error: function (oErr) {
                            oErrorMsg = oErr?.responseJSON?.error?.message;
                            oView.setBusy(false);
                            MessageBox.error("Error while saving changes : " + oErrorMsg);

                        }
                    });
                },
                error: function (xhr) {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load task instances" + xhr.responseText);
                }
            });
            return;

        },

        //Clear function
        onClear: function () {

            var oView = oRequestorObject.getView();
            var oTextArea = oView.byId("commentsSection");
            var oMessageStrip = oView.byId("commentsMessage");

            if (oTextArea) {
                oTextArea.setValue("");
                oTextArea.setValueState("None");
                oTextArea.setValueStateText("");
            }

            if (oMessageStrip) {
                oMessageStrip.setText("You can enter up to 250 characters.");
            }
        },

        _navigateBack: function () {
            var oRouter = oRequestorObject.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDashboard");
            oRequestorObject.onClear();
        },

        //Comments validation check
        onCommentsLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var iCharsLeft = 250 - sValue.length;
            this.byId("commentsMessage").setText(iCharsLeft + " characters left");

            var oTextArea = oEvent.getSource();
            var sValue = oTextArea.getValue();

            if (sValue.trim()) {
                oTextArea.setValueState("None");
                oTextArea.setValueStateText("");
            }
        },


        //Get Call for Attachments
        getAttachments: function (iIndex) {
            oFolderName = oRequestorObject.getView().getModel("oTableDataModel").getData().requestorData[iIndex].leadingDocumentName;

            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/AttachCount", 0);
            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/ToAttachment", []);
            var arr = [];
            oRequestorObject._initialAttachmentCount = 0;
            if (oFolderName !== null && oFolderName !== "" && oFolderName !== undefined) {
                var appId = oRequestorObject.getOwnerComponent().getManifestEntry("/sap.app/id");
                oRequestorObject.reworkappId = appId;
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);

                var sUrl = appModulePath + "/docservice/root/" + oFolderName + "?succinct=true";

                var oSettings = {
                    "url": sUrl,
                    "method": "GET",
                };
                $.ajax(oSettings)
                    .done(function (results) {
                        if (results.objects.length > 0) {
                            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/originalPerFolder", results.objects[0].object.succinctProperties["sap:parentIds"][0]);

                            for (var i = 0; i < results.objects.length; i++) {
                                var obj = {};
                                obj.Filename = results.objects[i].object.succinctProperties["cmis:name"];
                                obj.DmsUuid = results.objects[i].object.succinctProperties["cmis:objectId"];
                                arr.push(obj);
                            }
                            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/ToAttachment", arr);
                            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/AttachCount", arr.length);

                        }
                        if (arr.length !== undefined) {
                            oRequestorObject._initialAttachmentCount = arr.length;

                        }
                    })
                    .fail(function (err) {
                        if (arr.length !== undefined) {
                            oRequestorObject._initialAttachmentCount = arr.length;

                        }
                        if (err && err.responseText) {
                            MessageToast.show("Error in fetching attachments:" + err.responseText);
                        }
                    });
            }
        },

        //File Uploader DMS Integration  
        onAttachmentsChange: function (oEvent) {
            var oModel = oRequestorObject.getView().getModel('oTableDataModel');

            MessageBox.confirm(
                oRequestorObject.oResourceBundle.getText("overWrite"), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        // Perform operation
                        oRequestorObject.createNewFolder(oEvent);
                    } else {
                        var oFileUploader = oRequestorObject.byId("fileUploader");
                        oFileUploader.clear();
                    }
                }.bind(oRequestorObject)
            }
            );

        },

        handleTypeMissmatch: function (oEvent) {

            var sFileName = oEvent.getParameter("fileName");
            MessageBox.error("File type not supported: " + sFileName);
            this.byId("fileUploader").clear();

        },

        createNewFolder: function (oEvent) {
            
            oFolderID, oFolderName = undefined;
            var oFileUploader = oRequestorObject.byId("fileUploader");
            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/count", 0);
            oRequestorObject.getView().getModel("oTableDataModel").setProperty("/AttachCount", 0);

            let token = oRequestorObject.fetchDmsToken();
            //create Folder
            oRequestorObject.getView().setBusy(true);
            var orgFolder = oRequestorObject.getView().getModel("oTableDataModel").getData().requestorData[itemIndex].leadingDocumentName;
            let FolderName;
            if (orgFolder !== "" && orgFolder != undefined) {
                FolderName = orgFolder;
            } else {
                FolderName = oRequestorObject.createFolder();
                oRequestorObject.getView().getModel("oTableDataModel").setProperty("/requestorData/" + itemIndex + "/leadingDocumentName", FolderName);
            }

            oEvent.getSource().removeAllHeaderParameters()
            oEvent.getSource().removeAllParameters();

            let sPath = oRequestorObject._getDMSBaseUrl() + FolderName;

            oFileUploader.setUploadUrl(sPath);

            var oTokenHeader = new FileUploaderParameter({
                name: "x-csrf-token",
                value: token
            });
            oEvent.getSource().addHeaderParameter(oTokenHeader);
            var oUploadCollection = oEvent.getSource();

            var cmisActionHiddenFormParam = new FileUploaderParameter({
                name: "cmisaction",
                value: "createDocument" // create file
            });
            oUploadCollection.addParameter(cmisActionHiddenFormParam);

            var objectTypeIdHiddenFormParam1 = new FileUploaderParameter({
                name: "propertyId[0]",
                value: "cmis:objectTypeId"
            });
            oUploadCollection.addParameter(objectTypeIdHiddenFormParam1);

            var propertyValueHiddenFormParam2 = new FileUploaderParameter({
                name: "propertyValue[0]",
                value: "cmis:document"
            });
            oUploadCollection.addParameter(propertyValueHiddenFormParam2);

            var objectTypeIdHiddenFormParam3 = new FileUploaderParameter({
                name: "propertyId[1]",
                value: "cmis:name"
            });
            oUploadCollection.addParameter(objectTypeIdHiddenFormParam3);

            var propertyValueHiddenFormParam4 = new FileUploaderParameter({
                name: "propertyValue[1]",
                value: oEvent.getParameter("files")[0].name
            });
            oUploadCollection.addParameter(propertyValueHiddenFormParam4);

            var propertyValueHiddenFormParam5 = new FileUploaderParameter({
                name: "succinct",
                value: true
            });
            oUploadCollection.addParameter(propertyValueHiddenFormParam5);
            oFileUploader.upload();
            oRequestorObject.getView().setBusy(false);
        },

        createFolder: function () {

            let FolderName;
            let oTempFolderName = oRequestorObject._createFolderName();
            //First fetch token from dms path
            let token = oRequestorObject.fetchDmsToken();

            let oForm = new FormData();
            oForm.append("cmisaction", "createFolder");
            oForm.append("propertyId[0]", "cmis:name");
            oForm.append("propertyValue[0]", oTempFolderName);
            oForm.append("propertyId[1]", "cmis:objectTypeId");
            oForm.append("propertyValue[1]", "cmis:folder");
            oForm.append("succinct", 'true');

            let Surl = oRequestorObject._getDMSBaseUrl();
            var oSettings = {
                "url": Surl,
                "method": "POST",
                "async": false,
                "data": oForm,
                "cache": false,
                "contentType": false,
                "processData": false,
                "headers": {
                    'X-CSRF-Token': token
                }
            };

            $.ajax(oSettings)
                .done(function (results) {
                    oFolderID = results['succinctProperties']['cmis:objectId'];
                    oFolderName = results['succinctProperties']['cmis:name'];
                    FolderName = oFolderName;
                    oRequestorObject.getView().getModel("oTableDataModel").setProperty("/leadingDocumentInstanceId", oFolderID);
                })
                .fail(function (err) {

                    if (err !== undefined) {
                        var oErrorResponse = $.parseJSON(err.responseText);
                        MessageToast.show(oErrorResponse.message, {
                            duration: 6000
                        });
                    }


                });
            oRequestorObject.getView().setBusy(false);
            return FolderName;
        },
        _createFolderName: function () {
            let oDate = new Date();
            let oDay = oDate.getDate();
            let ohour = oDate.getHours();
            let oYear = oDate.getFullYear();
            let oMon = oDate.getMonth();
            let oMs = oDate.getMilliseconds();
            let oTimeStamp = '_' + oDay + oMon + oYear + ohour + oMs + '';
            let folderName = "workflowManagementDocuments" + oTimeStamp;
            return folderName;
        },
        handleUploadComplete: function (oEvent) {
            // Please note that the event response should be taken from the event parameters but for our test example, it is hardcoded.
           
            var oFileUploader = oRequestorObject.byId("fileUploader");
            var response = oEvent.getParameter("responseRaw");
            if (response) {
                try {
                    var oResponseData = JSON.parse(response);
                    //file will be first time upload then in repo because duplicate name file won't upload
                    if (oResponseData['succinctProperties'] !== '' && oResponseData['succinctProperties'] !== undefined) {

                        var uploadedFileId = oResponseData.succinctProperties["cmis:objectId"];
                        var oFName = oResponseData.succinctProperties["cmis:name"];
                        if (uploadedFileId) {
                            MessageToast.show(oRequestorObject.oResourceBundle.getText("fileUploadSuccess", oFName), {
                                duration: 7000 // 10 seconds
                            });
                        }

                        var oModel = oRequestorObject.getView().getModel('oTableDataModel');
                        var oAttachmentArray = oRequestorObject.getView().getModel('oTableDataModel').getProperty("/ToAttachment");
                        let payload = {
                            "DmsUuid": uploadedFileId,
                            "Filename": oFName,
                        }
                        oAttachmentArray.push(payload);
                        oModel.refresh();
                        let count = oModel.getProperty("/ToAttachment").length;
                        oRequestorObject.getView().getModel("oTableDataModel").setProperty("/AttachCount", count);
                    } else if (oResponseData.message) {
                        if (oResponseData.exception === "nameConstraintViolation") {
                            MessageBox.error("File with the same name has already been added.");
                        } else {
                            MessageBox.error(oResponseData.message);
                        }


                    }
                } catch (error) {
                    MessageToast.show(oRequestorObject.oResourceBundle.getText("fileUploadFail"));
                }
                oFileUploader.clear();
            }
        },
        fetchDmsToken: function () {
            jQuery.ajax({
                url: oRequestorObject._getDMSBaseUrl(),
                method: "GET",
                async: false,
                headers: {
                    "X-CSRF-Token": "Fetch",
                },
                success(result, xhr, data) {
                    token = data.getResponseHeader("X-CSRF-Token");
                },
            });

            return token;
        },
        handlePress: function (oEvent) {
            let token = oRequestorObject.fetchDmsToken();
            let oList = oEvent.getSource();
            let oPath = oList.getBindingInfo("text").binding.getContext().getPath();
            let ObjId = oRequestorObject.getView().getModel('oTableDataModel').getProperty(oPath).DmsUuid;
            var sUrl = oRequestorObject._getDMSBaseUrl() + "?objectId=" + ObjId + "&cmisSelector=content&download=attachment";
            var oSettings = {
                "url": sUrl,
                "method": "GET",
                "headers": {
                    "ContentType": 'application/json',
                    "Accept": 'application/json',
                    "cache": false,
                    'X-CSRF-Token': 'Fetch'
                }
            };

            $.ajax(oSettings)
                .done(function (results, textStatus, request) {
                   
                    token = request.getResponseHeader('X-Csrf-Token');

                    URLHelper.redirect(sUrl, false);

                })
                .fail(function (err) {
                    if (err !== undefined) {
                        // var oErrorResponse = $.parseJSON(err.responseText);
                        var oErrorResponse = err.responseText;
                        MessageBox.error(oErrorResponse.message);
                    } else {
                        MessageBox.error('DMS Request Failed');
                    }
                });
        },
        onConfirmDelete: function (oEvent) {
            let ObjPath = oEvent.getParameter("listItem").getBindingContext("oTableDataModel").getPath();
            let oModel = oRequestorObject.getView().getModel('oTableDataModel');
            let objectName = oModel.getProperty(ObjPath)['Filename'];
            MessageBox.confirm(
                oRequestorObject.oResourceBundle.getText("confirmDelete", objectName), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        // Perform delete operation
                        oRequestorObject.onDeleteAttachment(ObjPath, objectName);
                    } else {
                        var oFileUploader = oRequestorObject.byId("fileUploader");
                        oFileUploader.clear();
                    }
                }.bind(oRequestorObject)
            }
            );
        },
        onDeleteAttachment: function (ObjPath, objectName) {
           
            //delete attachment
            let oModel = oRequestorObject.getView().getModel('oTableDataModel');
            let objectId = oModel.getProperty(ObjPath)['DmsUuid'];

            var docuServiceBaseUrl = oRequestorObject._getDMSBaseUrl();
            var sUrl = docuServiceBaseUrl + oFolderName;

            //setting the count

            let oCountModel = oRequestorObject.getView().getModel('oTableDataModel'),
                that = oRequestorObject;

            const formData = new FormData();

            formData.append("cmisaction", "delete");
            formData.append("objectId", objectId);
            formData.append("allVersions", 'true');

            token = oRequestorObject.fetchDmsToken();

            var oSettings = {
                "url": sUrl,
                "method": "POST",
                "async": false,
                "data": formData,
                "cache": false,
                "contentType": false,
                "processData": false,
                "headers": {
                    'X-CSRF-Token': token
                }
            };

            $.ajax(oSettings)
                .done(function (results) {
                    
                    MessageToast.show(that.oResourceBundle.getText("fileDeleteSuccess", objectName), {
                        duration: 7000 // 10 seconds
                    });
                    let sIndex = ObjPath.split('/')[ObjPath.split('/').length - 1];
                    //removedata from model
                    oModel.getProperty('/ToAttachment').splice(sIndex, 1);
                    oModel.refresh(true);
                    let count = oModel.getProperty('/ToAttachment').length;
                    //setting the count
                    oCountModel.setProperty('/AttachCount', count);

                })
                .fail(function (err) {
                    
                    MessageBox.error('DMS Server Error');

                });

        },
        _getColorByState: function (oItem) {
            switch (oItem.getState()) {
                case "Error": return coreLibrary.IconColor.Negative;
                case "Warning": return coreLibrary.IconColor.Critical;
                case "Success": return coreLibrary.IconColor.Positive;
            }
        },
        itemPress: function (oEvent) {
            var oItem = oEvent.getSource(),
                aCustomData = oItem.getCustomData(),
                sTitle = aCustomData[0].getValue(),
                sIcon = aCustomData[1].getValue(),
                sSubTitle = aCustomData[2].getValue(),
                sDescription = aCustomData[3].getValue();

            var oPopover = new sap.m.Popover({
                contentWidth: "300px",
                title: "Request Status",
                content: [
                    new sap.m.HBox({
                        items: [
                            new sap.ui.core.Icon({
                                src: sIcon,
                                color: oRequestorObject._getColorByState(oItem)
                            }).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginEnd"),
                            new sap.m.FlexBox({
                                width: "100%",
                                renderType: "Bare",
                                direction: "Column",
                                items: [new sap.m.Title({
                                    level: coreLibrary.TitleLevel.H1,
                                    text: sTitle
                                }), new sap.m.Text({
                                    text: sSubTitle
                                }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop"),
                                new sap.m.Text({
                                    text: sDescription
                                })
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiTinyMargin")
                ],
                footer: [
                    new sap.m.Toolbar({
                        content: [
                            new sap.m.ToolbarSpacer(),
                            new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    oPopover.close();
                                }
                            })]
                    })
                ]
            });

            oPopover.openBy(oEvent.getParameter("item"));
        },

        dateFormat: function (value) {
            if (value) {
                var hour = new Date(value).getHours();
                var minute = new Date(value).getMinutes();
                var seconds = new Date(value).getSeconds();
                var date = new Date(value).getDate();
                var month = new Date(value).getMonth() + 1;
                var year = new Date(value).getFullYear();
                if (month < 10)
                    month = "0" + month;
                if (date < 10)
                    date = "0" + date;
                if (hour < 10)
                    hour = "0" + hour;
                if (minute < 10)
                    minute = "0" + minute;
                if (seconds < 10)
                    seconds = "0" + seconds;
                return year + "-" + month + "-" + date + "\n" + hour + ":" + minute + ":" + seconds;
            }
            return "";
        },

        commentSec: function () {
            var oCommentField = oRequestorObject.getView().byId("commentsSection");

            if (!oCommentField) {
                console.error("Comment field not found");
                return false;
            }

            var sComment = oCommentField.getValue();

            if (!sComment.trim()) {
                oCommentField.setValueState("Error");
                MessageBox.error("Please enter comments.");
                return false;
            }

            oCommentField.setValueState("None");
            return true;


        },

        //Reminder mail patch call
        onRemind: function () {
            var oView = oRequestorObject.getView(); // Get the view
            oView.setBusy(true);
            var oRemindModel = oView.getModel("oWorkflowModel");
            var oWFID = oRemindModel.getProperty("/rootId");
            var sUserEmail = oRemindModel.getProperty("/sUserEmail");
            var sComments = oRequestorObject.byId("commentsSection").getValue();
            var sloggedUser = sap.ushell.Container.getUser().getEmail();
            var sAttachCount = String(oView.getModel("oTableDataModel").getProperty("/AttachCount"));
            var leadDocName = oRequestorObject.getView().getModel("oTableDataModel").getProperty("/requestorData/" + itemIndex + "/leadingDocumentName");

            console.log("Workflow Instance ID :" + oWFID);
            console.log("Workflow Instance ID :" + sUserEmail);

            if (!oRequestorObject.commentSec()) {
                oView.setBusy(false);
                return;
            }

            var oErrorMsg = "";
            $.ajax({
                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances?status=READY&status=RESERVED&$top=1&workflowInstanceId=" + oWFID,
                method: "GET",
                contentType: "application/json",
                success: function (oData) {
                    var aTasks = oData;

                    if (aTasks.length === 0) {
                        oView.setBusy(false);
                        MessageBox.error("No task available");
                        return;
                    }

                    var sTaskId = aTasks[0].id;
                    var sStatus = aTasks[0].status;
                    var sProcessor = aTasks[0].processor;

                    if (sStatus === "RESERVED") {
                        oView.setBusy(false);
                        MessageBox.error("This task has already been claimed by " + sProcessor + ".");
                        return;
                    }

                    var sToken = oRequestorObject._fetchToken();

                    if (!sToken) {
                        oView.setBusy(false);
                        MessageBox.error("Failed to fetch CSRF token.");
                        return;
                    }
                    var payload = {
                        status: "COMPLETED",
                        decision: "remind",
                        context: {
                            "comments": sComments,
                            "assignee": "",
                            "role": "Requestor",
                            "user": sloggedUser,
                            "leadingDocumentName": leadDocName || "",
                            "leadingDocumentInstanceId": "",
                            "AttachCount": sAttachCount
                        },
                    };

                    $.ajax({
                        url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances/" + sTaskId,
                        method: "PATCH",
                        headers: {
                            "X-CSRF-Token": sToken,
                            "Content-Type": "application/json"
                        },
                        data: JSON.stringify(payload),
                        success: function (oData) {
                            oView.setBusy(false);
                            console.log("oData" + oData);
                            sap.m.MessageBox.success("Reminder email sent successfully.", {
                                onClose: function () {
                                    oRequestorObject._navigateBack();
                                }
                            });
                            oRequestorObject.onClear();


                        },
                        error: function (oErr) {
                            oErrorMsg = oErr?.responseJSON?.error?.message;
                            oView.setBusy(false);
                            // console.error("PATCH failed:", xhr.responseText);
                            MessageBox.error("Failed to send reminder email : " + oErrorMsg);

                        }
                    });
                },
                error: function (xhr) {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load task instances" + xhr.responseText);
                }
            });
            return;


        },

        //Reassign dialog
        onClickReassign: function () {

            if (!oRequestorObject.commentSec()) {
                return;
            }

            if (!oRequestorObject._oReassignDialog) {
                oRequestorObject._oReassignDialog = new sap.m.Dialog({
                    title: "Reassign",
                    contentWidth: "400px",
                    type: "Message",
                    content: [
                        new sap.m.Label({ text: "Enter Nokia Email", labelFor: "reassignEmail" }),
                        new sap.m.Input("reassignEmail", {
                            width: "100%",
                            placeholder: "username@nokia.com",
                            liveChange: function (oEvent) {
                                var sValue = oEvent.getParameter("value").trim();
                                var oInput = oEvent.getSource();

                                // Validation for Nokia email
                                var isValid = /^[^\s@]+@nokia\.com$/i.test(sValue);

                                if (isValid || sValue === "") {
                                    oInput.setValueState("None");
                                    oInput.setValueStateText("");
                                } else {
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText("Only Nokia emails (e.g., username@nokia.com) are allowed.");
                                }
                            }
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Reassign",
                        press: function () {
                            var oInput = sap.ui.getCore().byId("reassignEmail");
                            var sNewEmail = oInput.getValue().toLowerCase().trim();
                            var isValid = /^[^\s@]+@nokia\.com$/i.test(sNewEmail);

                            if (!isValid) {
                                oInput.setValueState("Error");
                                oInput.setValueStateText("Only Nokia emails (e.g., username@nokia.com) are allowed.");
                                return;
                            }

                            oRequestorObject._oReassignDialog.close();
                            oRequestorObject._onHandleReassign(sNewEmail); // Proceed with reassignment
                        }.bind(oRequestorObject)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            oRequestorObject._oReassignDialog.close();
                        }.bind(oRequestorObject)
                    })
                });

                oRequestorObject.getView().addDependent(oRequestorObject._oReassignDialog);
            }

            // Reset input state
            var oEmailInput = sap.ui.getCore().byId("reassignEmail");
            oEmailInput.setValue("");
            oEmailInput.setValueState("None");
            oEmailInput.setValueStateText("");

            oRequestorObject._oReassignDialog.open();
        },

        //Reassign patch call
        _onHandleReassign: function (sNewEmail) {
            var oView = oRequestorObject.getView(); // Get the view
            oView.setBusy(true);
            var sloggedUser = sap.ushell.Container.getUser().getEmail();
            var oReassignModel = oView.getModel("oWorkflowModel");
            var oWFID = oReassignModel.getProperty("/rootId");
            var sComments = oRequestorObject.byId("commentsSection").getValue();
            var sAttachCount = String(oView.getModel("oTableDataModel").getProperty("/AttachCount"));
            var leadDocName = oRequestorObject.getView().getModel("oTableDataModel").getProperty("/requestorData/" + itemIndex + "/leadingDocumentName");

            console.log("Workflow Instance ID :" + oWFID);

            var oErrorMsg = "";
            $.ajax({
                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances?status=READY&status=RESERVED&$top=1&workflowInstanceId=" + oWFID,
                method: "GET",
                contentType: "application/json",
                success: function (oData) {
                    var aTasks = oData;

                    if (aTasks.length === 0) {
                        oView.setBusy(false);
                        MessageBox.error("No task available");
                        return;
                    }

                    var sTaskId = aTasks[0].id;
                    var sStatus = aTasks[0].status;
                    var sProcessor = aTasks[0].processor;

                    if (sStatus === "RESERVED") {
                        oView.setBusy(false);
                        MessageBox.error("This task has already been claimed by " + sProcessor + ".");
                        return;
                    }

                    var sToken = oRequestorObject._fetchToken();

                    if (!sToken) {
                        oView.setBusy(false);
                        MessageBox.error("Failed to fetch CSRF token.");

                        return;
                    }
                    var payload = {
                        status: "COMPLETED",
                        decision: "reassign",
                        context: {
                            "comments": sComments,
                            "assignee": sNewEmail,
                            "role": "Requestor",
                            "user": sloggedUser,
                            "leadingDocumentName": leadDocName || "",
                            "leadingDocumentInstanceId": "",
                            "AttachCount": sAttachCount
                        },
                    };

                    $.ajax({
                        url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/task-instances/" + sTaskId,
                        method: "PATCH",
                        headers: {
                            "X-CSRF-Token": sToken,
                            "Content-Type": "application/json"
                        },
                        data: JSON.stringify(payload),
                        success: function (oData) {
                            oView.setBusy(false);
                            console.log("oData" + oData);
                            sap.m.MessageBox.success("Task Reassigned Successfully.", {
                                onClose: function () {
                                    oRequestorObject._navigateBack();
                                }
                            });
                            oRequestorObject.onClear();
                        },
                        error: function (oErr) {
                            oErrorMsg = oErr?.responseJSON?.error?.message;
                            oView.setBusy(false);
                            // console.error("PATCH failed:", xhr.responseText);
                            MessageBox.error("Failed to reassign task : " + oErrorMsg);
                        }
                    });
                },
                error: function (xhr) {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load task instances" + xhr.responseText);
                }
            });
            return;
        },

        _fetchToken: function () {
            var sToken = null;
            $.ajax({
                url: oRequestorObject._getWorkflowRuntimeBaseURL() + "/workflow-instances",
                method: "GET",
                async: false,
                headers: {
                    "X-CSRF-Token": "Fetch"
                },
                success: function (res, status, xhr) {
                    sToken = xhr.getResponseHeader("X-CSRF-Token");
                },
                error: function (xhr, status, error) {
                    console.log("CSRF token fetch failed:", error);
                }
            });
            return sToken;
        },
        _getWorkflowRuntimeBaseURL: function () {
            var appId = oRequestorObject.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath + "/OO_SBPA_admin/v1";

        },
        _getDMSBaseUrl: function () {
            var appId = oRequestorObject.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath + "/docservice/root/";
        },
    });
});