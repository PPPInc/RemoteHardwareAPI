/*
 *
 * Charge It Pro Cloud Hardware Library v1.0.3
 * https://www.chargeitpro.com/
 *
 * Copyright (C) Charge It Pro, Corporation. All rights reserved.
 *
 */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('cip', ['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function ($) {
    return new (function () {

        this.version = '1.0.3';

        /*
         * These functions are to be implemented by consuming Developers.
         */
        this.OnResultFunction; //Function to be called when transaction results are returned from cloud hardware.
        this.OnEchoFunction; //Function to be called when an echo response is returned from cloud hardware.
        this.OnConfigurationDownloadedFunction; //Function to be called when the configuration has been downloaded.
        this.OnErrorFunction; //Function to be called when the Hub reports an error.
        this.OnConnectedFunction; //Function to be called when Client connects to Hub.

        /*
         * These properties are to be set by consuming developers.
         */
        this.isTestMode = false; //Bool value indicating whether test mode is on or off.
        this.userName; //Unique name for this connection.
        this.controllerName; //Name of the cloud hardware controller to send transactions.
        this.locationId; //LocationId for this connection.
        this.devices; //Array of cloud hardware devices that transactions can be processed on.

        /*
         * These are functions that can be consumed by Developers and should not be assigned to or overwritten.
         */
        this.downloadConfiguration; //Call this function to download the configuration settings for your location.
        this.echoFunction; //Call this function to test connectivity between your web-based POS and the cloud hardware controller.
        this.debitSaleFunction; //Call this function to process a debit sale.
        this.creditSaleFunction; //Call this function to process a credit sale.
        this.creditReturnFunction; //Call this function to process a credit return.
        this.creditAuthFunction; //Call this function to authorize a transaction.
        this.creditForceFunction; //Call this function to force a credit sale.
        this.creditAddTipFunction; //Call this function to add a tip to a previous transaction.
        this.voidFunction; //Call this function to void a transaction.
        this.requestSignatureFunction; //Call this function to request a signature.
        this.saveCreditCardFunction; //Call this function to tokenize a credit card.
        this.displayTextFunction; //Call this function to display a message on the device screen.
        this.cancelFunction; //Call this function to cancel a transaction.
        this.pingFunction; //Call this function to ping a device and verify it is connected properly.

        /*
         * 'private' variables
         */
        var _connection;
        var _remoteHub;
        var _connected;

        /*
         * private functions
         */
        var _connect = function (done, fail) {

            if (controllerName === "") {
                if (OnErrorFunction) OnErrorFunction("ControllerName not set.");
                return;
            }

            var url;
            if (isTestMode) {
                url = "https://cloud-staging.chargeitpro.com";
            } else {
                url = "https://cloud.chargeitpro.com";
            }

            _connection = $.hubConnection(url);

            _connection.qs = { "userName": userName };

            _remoteHub = _connection.createHubProxy("DeviceHub");

            _remoteHub.on("send", function (from, message) {
                var result = JSON.parse(message);
                if (result.Action === "Echo") {
                    if (OnEchoFunction)
                        OnEchoFunction(result.Message);
                    return;
                } else if (result.Action === "Question") {
                    if (OnQuestionFunction)
                        OnQuestionFunction(result.Message);
                    return;
                } else if (result.Action === "Result") {
                    if (result.ResultFields) {
                        if (OnResultFunction)
                            OnResultFunction(result);
                    } else {
                        if (OnErrorFunction) OnErrorFunction("No Result returned from remote hardware.");
                    }
                    return;
                }
            });

            _remoteHub.on("error", function (error) {
                if (OnErrorFunction) OnErrorFunction(error);
            });

            _connection.start().done(function () {
                _connected = true;
                console.log("Connected as: " + _connection.id);
                if (OnConnectedFunction) OnConnectedFunction(_connection);
                done();
            }).fail(function (error) {
                _connected = false;
                console.log(error);
                fail();
            });

            _connection.error(function (error) {
                _connected = false;
                console.log("SignalR error: " + error);
            });
        }

        this._doTransaction = function (message) {

            if (_connection != null && _connection.state == 0) return; //the connection is negotiating.

            try {
                if (_connection != null && _connection.state == 1)
                    _remoteHub.invoke("send", controllerName, locationId, JSON.stringify(message));
                else {
                    _connect(function () {
                        _remoteHub.invoke("send", controllerName, locationId, JSON.stringify(message));
                    }, function () { if (OnErrorFunction) OnErrorFunction("Error connecting."); });
                }
            }
            catch (err) {
                console.log("Error in _doTransaction: " + err);
            }
        }

        creditSaleFunction = function (deviceName, amount, uniqueTransRef) {
            var csMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditSale", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef }
            };
            _doTransaction(csMessage);
        }

        creditReturnFunction = function (deviceName, amount, uniqueTransRef) {
            var crMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditReturn", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef }
            };
            _doTransaction(crMessage);
        }

        creditAuthFunction = function (deviceName, amount) {
            var caMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditAuth", Amount: amount, DeviceName: deviceName }
            };
            _doTransaction(caMessage);
        }

        creditForceFunction = function (deviceName, amount, authCode, uniqueTransRef) {
            var cfMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditForce", Amount: amount, DeviceName: deviceName, VoiceAuthCode: authCode, UniqueTransRef: uniqueTransRef }
            };
            _doTransaction(cfMessage);
        }

        creditAddTipFunction = function (deviceName, amount, uniqueTransRef) {
            var catMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditAddTip", Amount: amount, DeviceName: deviceName, UniqueTransRef: uniqueTransRef }
            };
            _doTransaction(catMessage);
        }

        saveCreditCardFunction = function (deviceName) {
            var sccMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "CreditSaveCard", Amount: "0.05", DeviceName: deviceName }
            };
            _doTransaction(sccMessage);
        }

        debitSaleFunction = function (deviceName, amount) {
            var dsMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "DebitSale", Amount: amount, DeviceName: deviceName }
            };
            _doTransaction(dsMessage);
        }

        echoFunction = function (message) {
            var eMessage = { Action: "Echo", Message: message };
            _doTransaction(eMessage);
        }

        pingFunction = function (deviceName) {
            var pMessage = { Action: "Ping", TestMode: isTestMode, Data: { DeviceName: deviceName } };
            _doTransaction(pMessage);
        }

        voidFunction = function (deviceName, uniqueTransRef) {
            var vMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "Void", UniqueTransRef: uniqueTransRef, DeviceName: deviceName }
            };
            _doTransaction(vMessage);
        }

        requestSignatureFunction = function (deviceName) {
            var rsMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "RequestSignature", DeviceName: deviceName }
            };
            _doTransaction(rsMessage);
        }

        displayTextFunction = function (deviceName, displayText) {
            var dtMessage = {
                Action: "Transaction", TestMode: isTestMode, Data: { TransactionType: "DisplayText", DeviceName: deviceName, DisplayText: displayText }
            };
            _doTransaction(dtMessage);
        }

        cancelFunction = function (deviceName) {
            var cancelMessage = { Action: "CancelTransaction", TestMode: isTestMode, Data: { DeviceName: deviceName } };
            _doTransaction(cancelMessage);
        }

        downloadConfiguration = function (locationId) {
            if (!locationId) return;
            var url;
            if (isTestMode) {
                url = "https://cloud-staging.chargeitpro.com/Config/";
            } else {
                url = "https://cloud.chargeitpro.com/Config/";
            }
            $.ajax({
                url: url + locationId,
                headers: { "Content-Type": "application/json" }
            }).done(function (data) {
                if (data.Success === true) {
                    controllerName = data.Result.ControllerName;
                    devices = data.Result.Devices;
                    if (!OnConfigurationDownloadedFunction) {
                        alert("Configuration successfully downloaded.");
                        return;
                    }
                    devices.sort(function (a, b) {
                        if (a.DeviceName < b.DeviceName) return -1;
                        if (a.DeviceName > b.DeviceName) return 1;
                        return 0;
                    });
                    if (OnConfigurationDownloadedFunction) OnConfigurationDownloadedFunction();
                }
            }).fail(function (error) {
                alert("Unable to download configuration.");
            });
        }
    });
}));

