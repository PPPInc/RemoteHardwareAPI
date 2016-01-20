/*
 * Charge It Pro Cloud Hardware Library v1.0.0
 * https://www.chargeitpro.com/
 *
 * Copyright (C) Charge It Pro, Corporation. All rights reserved.
 *
 */

var CIP = {

    /*
     * These functions are to be implemented by consuming Developers.
     */
    OnResultFunction: null, //Function to be called when transaction results are returned from remote hardware.
    OnEchoFunction: null, //Function to be called when an echo response is returned from remote hardware.
    OnQuestionFunction: null, //Function to be called when remote hardware requires input from the POS to finish a transaction.
    OnConfigurationDownloadedFunction: null, //Function to be called when the configuration has been downloaded.
    OnErrorFunction: null, //Function to be called when the Hub reports an error.
    OnConnectedFunction: null, //Function to be called when Client connects to Hub.

    /*
     * These properties are to be set by consuming developers.
     */
    isTestMode: false, //Bool value indicating whether test mode is on or off.
    userName: '', //Unique name for this connection.
    controllerName: '', //Name of the remote hardware controller to send transactions.
    locationId: '', //LocationId for this connection.
    devices: [], //Array of remote hardware devices that transactions can be processed on.

    /*
     * These are functions that can be consumed by Developers and should not be assigned to or overwritten.
     */
    downloadConfiguration: null, //Call this function to download the configuration settings for your location.
    answerYesFunction: null, //Call this function to respond with "YES" to a question request from remote hardware.
    answerNoFunction: null, //Call this function to respond with "NO" to a question request from rmote hardware.
    echoFunction: null, //Call this function to test connectivity between your web-based POS and the remote hardware controller.
    debitSaleFunction: null, //Call this function to process a debit sale.
    creditSaleFunction: null, //Call this function to process a credit sale.
    creditReturnFunction: null, //Call this function to process a credit return.
    creditAuthFunction: null, //Call this function to authorize a transaction.
    creditForceFunction: null, //Call this function to force a credit sale.
    creditAddTipFunction: null, //Call this function to add a tip to a previous transaction.
    voidFunction: null, //Call this function to void a transaction.
    requestSignatureFunction: null, //Call this function to request a signature.
    saveCreditCardFunction: null, //Call this function to tokenize a credit card.
    displayTextFunction: null, //Call this function to display a message on the device screen.
    cancelFunction: null, //Call this function to cancel a transaction.

    /*
     * private variables
     */
    _remoteHub: null,
    _connected: false,

    /*
     * private functions
     */
    _connect: function (done, fail) {

        if (CIP.controllerName === "") {
            if (CIP.OnErrorFunction) CIP.OnErrorFunction("ControllerName not set.");
            return;
        }

        var url;
        if (CIP.isTestMode) {
            //url = 'http://localhost:57192';
            url = "https://psl-staging.chargeitpro.com";
        } else {
            url = "https://psl.chargeitpro.com";
        }

        var connection = $.hubConnection(url);

        connection.qs = { "userName": CIP.userName };

        _remoteHub = connection.createHubProxy("DeviceHub");

        _remoteHub.on("send", function (from, message) {
            var result = JSON.parse(message);
            if (result.Action === "Echo") {
                if (CIP.OnEchoFunction)
                    CIP.OnEchoFunction(result.Data);
                return;
            } else if (result.Action === "Question") {
                if (CIP.OnQuestionFunction)
                    CIP.OnQuestionFunction(result.Data);
                return;
            } else if (result.Action === "Result") {
                if (result.ResultFields) {
                    if (CIP.OnResultFunction)
                        CIP.OnResultFunction(result);
                } else {
                    if (CIP.OnErrorFunction) CIP.OnErrorFunction("No Result returned from remote hardware.");
                }
                return;
            }
        });

        _remoteHub.on("error", function (error) {
            if (CIP.OnErrorFunction) CIP.OnErrorFunction(error);
        });

        connection.start().done(function () {
            _connected = true;
            console.log("Connected as: " + connection.id);
            if (CIP.OnConnectedFunction) CIP.OnConnectedFunction(connection);
            done();
        }).fail(function (error) {
            _connected = false;
            console.log(error);
            fail();
        });

        connection.error(function (error) {
            _connected = false;
            console.log("SignalR error: " + error);
        });
    },

    _doTransaction: function (message) {
        if (!this._connected)
            this._connect(function () {
                this._remoteHub.invoke("send", CIP.controllerName, CIP.locationId, JSON.stringify(message));
            }, function () { if(CIP.OnErrorFunction) CIP.OnErrorFunction("Error connecting."); });
        else {
            this._remoteHub.invoke("send", CIP.controllerName, CIP.locationId, JSON.stringify(message));
        }
    },

    answerYesFunction: function () {
        var yesMessage = { Action: "Answer", Success: true };
        this._doTransaction(yesMessage);
    },

    answerNoFunction: function () {
        var noMessage = { Action: "Answer", Success: false };
        this._doTransaction(noMessage);
    },

    creditSaleFunction: function (deviceName, amount, accountNumber, billingName, expDate, cvv, street, zip) {
        var csMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditSale", Amount:amount, AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName: deviceName})
        };
        this._doTransaction(csMessage);
    },

    creditReturnFunction: function (deviceName, amount) {
        var crMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditReturn", Amount:amount, DeviceName: deviceName})
        };
        this._doTransaction(crMessage);
    },

    creditAuthFunction: function (deviceName, amount, accountNumber, billingName, expDate, cvv, street, zip) {
        var caMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditAuth", Amount:amount, AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName: deviceName})
        };
        this._doTransaction(caMessage);
    },

    creditForceFunction: function (deviceName, amount, authCode, uniqueTransRef) {
        var cfMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditForce", Amount:amount, DeviceName: deviceName, VoiceAuthCode: authCode, UniqueTransRef: uniqueTransRef})
        };
        this._doTransaction(cfMessage);
    },

    creditAddTipFunction: function (deviceName, amount, uniqueTransRef) {
        var catMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditAddTip", Amount:amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef})
        };
        this._doTransaction(catMessage);
    },

    saveCreditCardFunction: function (deviceName, accountNumber, billingName, expDate, cvv, street, zip) {
        var sccMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "CreditSaveCard",Amount: "0.05", AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName:deviceName})
        };
        this._doTransaction(sccMessage);
    },

    debitSaleFunction: function (deviceName, amount) {
        var dsMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "DebitSale", Amount:amount, DeviceName: deviceName})
        };
        this._doTransaction(dsMessage);
    },

    echoFunction: function (message) {
        var eMessage = { Action: "Echo", Data: message };
        this._doTransaction(eMessage);
    },

    voidFunction: function (deviceName, uniqueTransRef) {
        var vMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "Void", UniqueTransRef:uniqueTransRef, DeviceName: deviceName})
        };
        this._doTransaction(vMessage);
    },

    requestSignatureFunction: function (deviceName) {
        var rsMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "RequestSignature",DeviceName: deviceName})
        };
        this._doTransaction(rsMessage);
    },

    displayTextFunction: function (deviceName, displayText) {
        var dtMessage = {
            Action: "Transaction", TestMode: CIP.isTestMode, Data: JSON.stringify({TransactionType: "DisplayText",DeviceName: deviceName, DisplayText: displayText})
        };
        this._doTransaction(dtMessage);
    },

    cancelFunction: function (deviceName) {
        var cancelMessage = { Action: "CancelTransaction", TestMode: CIP.isTestMode, Data: JSON.stringify({ DeviceName: deviceName }) };
        _doTransaction(cancelMessage);
    },

    downloadConfiguration: function (locationId) {
        if (!locationId) return;
        var url;
        if (CIP.isTestMode) {
            url = "https://api-staging.chargeitpro.com/RemoteConfig/";
        } else {
            url = "https://api.chargeitpro.com/RemoteConfig/";
        }
        $.ajax({
            url: url + locationId,
            headers: { "Content-Type": "application/json" }
        }).done(function (data) {
            if (data.Success === true) {
                CIP.controllerName = data.Result.ControllerName;
                CIP.devices = data.Result.Devices;
                if (!CIP.OnConfigurationDownloadedFunction) {
                    alert("Configuration successfully downloaded.");
                    return;
                }
                CIP.devices.sort(function (a, b) {
                    if (a.DeviceName < b.DeviceName) return -1;
                    if (a.DeviceName > b.DeviceName) return 1;
                    return 0;
                });
                if (CIP.OnConfigurationDownloadedFunction) CIP.OnConfigurationDownloadedFunction();
            }
        }).fail(function (error) {
            alert("Unable to download configuration.");
        });
    }
};
