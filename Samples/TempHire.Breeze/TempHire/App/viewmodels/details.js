﻿define(['services/unitofwork', 'services/logger', 'durandal/system', 'durandal/viewModel', 'viewmodels/contacts', 'durandal/app', 'viewmodels/nameeditor', 'viewmodels/dialog'],
    function(unitofwork, logger, system, viewModel, contacts, app, nameeditor, dialog) {

        var Details = (function() {

            var ctor = function(id) {
                this.title = 'Details View';
                this.staffingResourceId = id;
                this.staffingResource = ko.observable();
                this.initialized = ko.observable();
                this.canSave = ko.observable(false);
                
                var ref = unitofwork.get(id);
                this.unitOfWork = ref.value();

                this.contacts = viewModel.activator();
            };

            system.setModuleId(ctor, 'viewmodels/details');

            ctor.prototype.activate = function () {
                // Subscribe to events
                app.on('hasChanges', function() {
                    this.canSave(this.unitOfWork.hasChanges());
                }, this);

                var self = this;
                return Q.when(this.contacts.activate())
                    .then(function() {
                        if (self.initialized()) {
                            return true;
                        }

                        return self.unitOfWork.staffingResources.withId(self.staffingResourceId)
                            .then(function(data) {
                                self.staffingResource(data);
                                self.log("StaffingResource loaded", true);
                                return Q.when(self.contacts.activateItem(contacts.create(self.staffingResourceId)))
                                    .then(function() {
                                        self.initialized(true);
                                        return true;
                                    });
                            });
                    })
                    .fail(this.handleError);
            };

            ctor.prototype.canDeactivate = function (close) {
                var self = this;
                if (this.unitOfWork.hasChanges() && close) {
                    return Q.when(app.showMessage("You have pending changes. Would you like to save them?", "Confirm", ['Yes', 'No', 'Cancel']))
                        .then(function(response) {
                            if (response === 'Yes') {
                                return self.unitOfWork.commit()
                                    .then(function() { return true; })
                                    .fail(self.handleError);
                            }
                            else if (response === 'No') {
                                self.unitOfWork.rollback();
                                return true;
                            }
                            return false;
                        });
                }

                return true;
            };
            
            ctor.prototype.deactivate = function(close) {
                app.off(null, null, this);

                if (close) {
                    unitofwork.get(this.staffingResourceId).release();
                    this.initialized(false);
                }

                return this.contacts.deactivate(close);
            };

            ctor.prototype.save = function () {
                this.unitOfWork.commit().fail(this.handleError);
            };

            ctor.prototype.cancel = function() {
                this.unitOfWork.rollback();
            };

            ctor.prototype.editName = function () {
                var staffingResource = this;
                var editor = nameeditor.create(staffingResource.id());
                dialog.show(editor, ['Ok', 'Cancel'])
                    .then(function(response) {
                        if (response === 'Ok') {
                            staffingResource.firstName(editor.firstName());
                            staffingResource.middleName(editor.middleName());
                            staffingResource.lastName(editor.lastName());
                        }
                    })
                    .done();
            };

            ctor.prototype.handleError = function(error) {
                logger.log(error.message, null, system.getModuleId(this), true);
                throw error;
            };

            ctor.prototype.log = function(message, showToast) {
                logger.log(message, null, system.getModuleId(this), showToast);
            };

            return ctor;
        })();

        return {
            create: create
        };

        function create(id) {
            return new Details(id);
        }
    });