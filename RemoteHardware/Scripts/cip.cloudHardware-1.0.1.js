/*
 *
 * Charge It Pro Cloud Hardware Library v1.0.1
 * https://www.chargeitpro.com/
 *
 * Copyright (C) Charge It Pro, Corporation. All rights reserved.
 *
 */

var CIP = CIP || {};

CIP = new (function ($) {

    var self = this;

    self.noConflict = function () {
        return CIP;
    };

    self.version = '1.0.1';

    /*
     * These functions are to be implemented by consuming Developers.
     */
    self.OnResultFunction; //Function to be called when transaction results are returned from cloud hardware.
    self.OnEchoFunction; //Function to be called when an echo response is returned from cloud hardware.
    self.OnConfigurationDownloadedFunction; //Function to be called when the configuration has been downloaded.
    self.OnErrorFunction; //Function to be called when the Hub reports an error.
    self.OnConnectedFunction; //Function to be called when Client connects to Hub.

    /*
     * These properties are to be set by consuming developers.
     */
    self.isTestMode = false; //Bool value indicating whether test mode is on or off.
    self.userName; //Unique name for this connection.
    self.controllerName; //Name of the cloud hardware controller to send transactions.
    self.locationId; //LocationId for this connection.
    self.devices; //Array of cloud hardware devices that transactions can be processed on.

    /*
     * These are functions that can be consumed by Developers and should not be assigned to or overwritten.
     */
    self.downloadConfiguration; //Call this function to download the configuration settings for your location.
    self.echoFunction; //Call this function to test connectivity between your web-based POS and the cloud hardware controller.
    self.debitSaleFunction; //Call this function to process a debit sale.
    self.creditSaleFunction; //Call this function to process a credit sale.
    self.creditReturnFunction; //Call this function to process a credit return.
    self.creditAuthFunction; //Call this function to authorize a transaction.
    self.creditForceFunction; //Call this function to force a credit sale.
    self.creditAddTipFunction; //Call this function to add a tip to a previous transaction.
    self.voidFunction; //Call this function to void a transaction.
    self.requestSignatureFunction; //Call this function to request a signature.
    self.saveCreditCardFunction; //Call this function to tokenize a credit card.
    self.displayTextFunction; //Call this function to display a message on the device screen.
    self.cancelFunction; //Call this function to cancel a transaction.
    self.pingFunction; //Call this function to ping a device and verify it is connected properly.

    /*
     * private variables
     */
    self.connection;
    self._remoteHub;
    self._connected;

    /*
     * private functions
     */
    self._connect = function (done, fail) {

        if (self.controllerName === "") {
            if (self.OnErrorFunction) self.OnErrorFunction("ControllerName not set.");
            return;
        }

        var url;
        if (self.isTestMode) {
            //url = 'http://localhost:54769';
            url = "https://cloud-staging.chargeitpro.com";
        } else {
            url = "https://cloud.chargeitpro.com";
        }

        self.connection = $.hubConnection(url);

        self.connection.qs = { "userName": self.userName };

        self._remoteHub = self.connection.createHubProxy("DeviceHub");

        self._remoteHub.on("send", function (from, message) {
            var result = JSON.parse(message);
            if (result.Action === "Echo") {
                if (self.OnEchoFunction)
                    self.OnEchoFunction(result.Message);
                return;
            } else if (result.Action === "Question") {
                if (self.OnQuestionFunction)
                    self.OnQuestionFunction(result.Message);
                return;
            } else if (result.Action === "Result") {
                if (result.ResultFields) {
                    if (self.OnResultFunction)
                        self.OnResultFunction(result);
                } else {
                    if (self.OnErrorFunction) self.OnErrorFunction("No Result returned from remote hardware.");
                }
                return;
            }
        });

        self._remoteHub.on("error", function (error) {
            if (self.OnErrorFunction) self.OnErrorFunction(error);
        });

        self.connection.start().done(function () {
            self._connected = true;
            console.log("Connected as: " + self.connection.id);
            if (self.OnConnectedFunction) self.OnConnectedFunction(self.connection);
            done();
        }).fail(function (error) {
            _connected = false;
            console.log(error);
            fail();
        });

        self.connection.error(function (error) {
            _connected = false;
            console.log("SignalR error: " + error);
        });
    }

    self._doTransaction = function (message) {
        if (self.connection == undefined || self.connection.state != 1)
            self._connect(function () {
                self._remoteHub.invoke("send", self.controllerName, self.locationId, JSON.stringify(message));
            }, function () { if (self.OnErrorFunction) self.OnErrorFunction("Error connecting."); });
        else {
            self._remoteHub.invoke("send", self.controllerName, self.locationId, JSON.stringify(message));
        }
    }

    self.creditSaleFunction = function (deviceName, amount, uniqueTransRef, cashier, transactionRef) {
        var csMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditSale", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(csMessage);
    }

    self.creditReturnFunction = function (deviceName, amount, uniqueTransRef, cashier, transactionRef) {
        var crMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditReturn", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(crMessage);
    }

    self.creditAuthFunction = function (deviceName, amount, cashier, transactionRef) {
        var caMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditAuth", Amount: amount, DeviceName: deviceName, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(caMessage);
    }

    self.creditForceFunction = function (deviceName, amount, authCode, uniqueTransRef, cashier, transactionRef) {
        var cfMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditForce", Amount: amount, DeviceName: deviceName, VoiceAuthCode: authCode, UniqueTransRef: uniqueTransRef, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(cfMessage);
    }

    self.creditAddTipFunction = function (deviceName, amount, uniqueTransRef, cashier, transactionRef) {
        var catMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditAddTip", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(catMessage);
    }

    self.saveCreditCardFunction = function (deviceName, cashier, transactionRef) {
        var sccMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "CreditSaveCard", Amount: "0.05", DeviceName: deviceName, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(sccMessage);
    }

    self.debitSaleFunction = function (deviceName, amount, cashier, transactionRef) {
        var dsMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "DebitSale", Amount: amount, DeviceName: deviceName, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(dsMessage);
    }

    self.echoFunction = function (message) {
        var eMessage = { Action: "Echo", Message: message };
        self._doTransaction(eMessage);
    }

    self.pingFunction = function (deviceName) {
        var pMessage = { Action: "Ping", TestMode: self.isTestMode, Data: { DeviceName: deviceName } };
        self._doTransaction(pMessage);
    }

    self.voidFunction = function (deviceName, uniqueTransRef, cashier, transactionRef) {
        var vMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "Void", UniqueTransRef: uniqueTransRef, DeviceName: deviceName, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(vMessage);
    }

    self.requestSignatureFunction = function (deviceName, cashier, transactionRef) {
        var rsMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "RequestSignature", DeviceName: deviceName, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(rsMessage);
    }

    self.displayTextFunction = function (deviceName, displayText, cashier, transactionRef) {
        var dtMessage = {
            Action: "Transaction", TestMode: self.isTestMode, Data: { TransactionType: "DisplayText", DeviceName: deviceName, DisplayText: displayText, Cashier: cashier, TransactionRef: transactionRef }
        };
        self._doTransaction(dtMessage);
    }

    self.cancelFunction = function (deviceName) {
        var cancelMessage = { Action: "CancelTransaction", TestMode: self.isTestMode, Data: { DeviceName: deviceName } };
        self._doTransaction(cancelMessage);
    }

    self.downloadConfiguration = function (locationId) {
        if (!locationId) return;
        var url;
        if (self.isTestMode) {
            url = "https://cloud-staging.chargeitpro.com/Config/";
        } else {
            url = "https://cloud.chargeitpro.com/Config/";
        }
        $.ajax({
            url: url + locationId,
            headers: { "Content-Type": "application/json" }
        }).done(function (data) {
            if (data.Success === true) {
                self.controllerName = data.Result.ControllerName;
                self.devices = data.Result.Devices;
                if (!self.OnConfigurationDownloadedFunction) {
                    alert("Configuration successfully downloaded.");
                    return;
                }
                self.devices.sort(function (a, b) {
                    if (a.DeviceName < b.DeviceName) return -1;
                    if (a.DeviceName > b.DeviceName) return 1;
                    return 0;
                });
                if (self.OnConfigurationDownloadedFunction) self.OnConfigurationDownloadedFunction();
            }
        }).fail(function (error) {
            alert("Unable to download configuration.");
        });
    }
})(window.jQuery);
