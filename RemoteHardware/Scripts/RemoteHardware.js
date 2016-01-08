﻿/*
 * These functions need to be implemented by consuming Developers.
 */
var OnResultFunction; //Function to be called when transaction results are returned from remote hardware.
var OnEchoFunction; //Function to be called when an echo response is returned from remote hardware.
var OnQuestionFunction; //Function to be called when remote hardware requires input from the POS to finish a transaction.
var OnConfigurationDownloaded; //Function to be called when the configuration has been downloaded.
var OnErrorFunction; //Function to be called when the Hub reports an error.
var OnConnectedFunction; //Function to be called when Client connects to Hub.

/*
 * This property must be set by consuming developers.
 */
var IsTestMode; //Bool value indicating whether test mode is on or off.

/*
 * These variables can be used by consuming Developers.
 */
var UserName; //Unique name for this connection.
var ControllerName; //Name of the remote hardware controller to send transactions.
var LocationId; //LocationId for this connection.
var Devices; //Array of remote hardware devices that transactions can be processed on.

/*
 * These are functions that can be consumed by Developers and should not be assigned to or overwritten.
 */
var downloadConfiguration; //Call this function to download the configuration settings for your location.
var answerYesFunction; //Call this function to respond with "YES" to a question request from remote hardware.
var answerNoFunction; //Call this function to respond with "NO" to a question request from rmote hardware.
var echoFunction; //Call this function to test connectivity between your web-based POS and the remote hardware controller.
var debitSaleFunction; //Call this function to process a debit sale.
var creditSaleFunction; //Call this function to process a credit sale.
var creditReturnFunction; //Call this function to process a credit return.
var creditAuthFunction; //Call this function to authorize a transaction.
var creditForceFunction; //Call this function to force a credit sale.
var creditAddTipFunction; //Call this function to add a tip to a previous transaction.
var voidFunction; //Call this function to void a transaction.
var requestSignatureFunction; //Call this function to request a signature.
var saveCreditCardFunction; //Call this function to tokenize a credit card.
var displayTextFunction; //Call this function to display a message on the device screen.
var cancelFunction; //Call this function to cancel a transaction.

/*
 * private variables
 */
var _remoteHub;
var _connected = false;

/*
 * private functions
 */
var _connect;
var _doTransaction;

$(function() {

    _connect = function (done, fail) {
        if (UserName === "") {
            //alert("UserName not set.");
            //return;
        }
        if (ControllerName === "") {
            alert("ControllerName not set.");
            return;
        }

        var url;
        if (IsTestMode) {
            //url = 'http://localhost:57192';
            url = "https://psl-staging.chargeitpro.com";
        } else {
            url = "https://psl.chargeitpro.com";
        }

        var connection = $.hubConnection(url);

        connection.qs = { "userName": UserName };

        _remoteHub = connection.createHubProxy("DeviceHub");

        _remoteHub.on("send", function(from, message) {
            var result = JSON.parse(message);
            if (result.Action === "Echo") {
                if (OnEchoFunction)
                    OnEchoFunction(result.Data);
                return;
            } else if (result.Action === "Question") {
                if (OnQuestionFunction)
                    OnQuestionFunction(result.Data);
                return;
            } else if (result.Action === "Result") {
                if (result.ResultFields) {
                    if (OnResultFunction)
                        OnResultFunction(result);
                } else {
                    alert("No Result returned from remote hardware.");
                }
                return;
            }
        });

        _remoteHub.on("error", function (error) {
            OnErrorFunction(error);
        });

        connection.start().done(function() {
            _connected = true;
            console.log("Connected as: " + connection.id);
            if(OnConnectedFunction !== undefined) OnConnectedFunction(connection);
            done();
        }).fail(function(error) {
            _connected = false;
            console.log(error);
            fail();
        });

        connection.error(function(error) {
            _connected = false;
            console.log("SignalR error: " + error);
        });
    };

    _doTransaction = function(message) {
        if (!_connected)
            _connect(function () {
                _remoteHub.invoke("send", ControllerName, LocationId, JSON.stringify(message));
            }, function () { alert("Error connecting."); });
        else {
            _remoteHub.invoke("send", ControllerName, LocationId, JSON.stringify(message));
        }
    };

    answerYesFunction = function() {
        var yesMessage = { Action: "Answer", Success: true };
        _doTransaction(yesMessage);
    };

    answerNoFunction = function() {
        var noMessage = { Action: "Answer", Success: false };
        _doTransaction(noMessage);
    };

    creditSaleFunction = function(deviceName, amount, accountNumber, billingName, expDate, cvv, street, zip) {
        var csMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditSale", Amount: amount, AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName: deviceName }) };
        _doTransaction(csMessage);
    };

    creditReturnFunction = function (deviceName, amount) {
        var crMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditReturn", Amount: amount, DeviceName: deviceName }) };
        _doTransaction(crMessage);
    };

    creditAuthFunction = function (deviceName, amount, accountNumber, billingName, expDate, cvv, street, zip) {
        var caMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditAuth", Amount: amount, AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName: deviceName }) };
        _doTransaction(caMessage);
    };

    creditForceFunction = function (deviceName, amount, authCode, uniqueTransRef) {
        var cfMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditForce", Amount: amount, DeviceName: deviceName, VoiceAuthCode: authCode, UniqueTransRef: uniqueTransRef }) };
        _doTransaction(cfMessage);
    };

    creditAddTipFunction = function (deviceName, amount, uniqueTransRef) {
        var catMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditAddTip", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef }) };
        _doTransaction(catMessage);
    };

    saveCreditCardFunction = function (deviceName, accountNumber, billingName, expDate, cvv, street, zip) {
        var sccMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "CreditSaveCard", Amount: "0.05", AccountNumber: accountNumber, BillingName: billingName, ExpDate: expDate, CVV: cvv, Street: street, Zip: zip, DeviceName: deviceName }) };
        _doTransaction(sccMessage);
    };

    debitSaleFunction = function (deviceName, amount) {
        var dsMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "DebitSale", Amount: amount, DeviceName: deviceName }) };
        _doTransaction(dsMessage);
    };

    echoFunction = function(message) {
        var eMessage = { Action: "Echo", Data: message };
        _doTransaction(eMessage);
    };

    voidFunction = function (deviceName, uniqueTransRef) {
        var vMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "Void", UniqueTransRef: uniqueTransRef, DeviceName: deviceName }) };
        _doTransaction(vMessage);
    };

    requestSignatureFunction = function (deviceName) {
        var rsMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "RequestSignature", DeviceName: deviceName }) };
        _doTransaction(rsMessage);
    };

    displayTextFunction = function (deviceName, displayText) {
        var dtMessage = { Action: "Transaction", TestMode: IsTestMode, Data: JSON.stringify({ TransactionType: "DisplayText", DeviceName: deviceName, DisplayText: displayText }) };
        _doTransaction(dtMessage);
    };

    cancelFunction = function(deviceName) {
        var cancelMessage = { Action: "CancelTransaction", TestMode: IsTestMode, Data: JSON.stringify({ DeviceName: deviceName }) };
        _doTransaction(cancelMessage);
    }

    downloadConfiguration = function (locationId) {
        if (!locationId) return;
        var url;
        if (IsTestMode) {
            url = "https://api-staging.chargeitpro.com/RemoteConfig/";
        } else {
            url = "https://api.chargeitpro.com/RemoteConfig/";
        }
        $.ajax({
            url: url + locationId,
            headers: { "Content-Type" : "application/json" }
        }).done(function (data) {
            if (data.Success === true) {
                ControllerName = data.Result.ControllerName;
                Devices = data.Result.Devices;
                if (!OnConfigurationDownloaded) {
                    alert("Configuration successfully downloaded.");
                    return;
                }
                Devices.sort(function (a, b) {
                    if (a.DeviceName < b.DeviceName) return -1;
                    if (a.DeviceName > b.DeviceName) return 1;
                    return 0;
                });
                OnConfigurationDownloaded();
            }
        }).fail(function(error) {
            alert("Unable to download configuration.");
        });
    }
});