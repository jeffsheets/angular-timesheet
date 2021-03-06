describe('Timesheets', function() {

  var expect = chai.expect;
  var $rootScope,
    $controller,
    $httpBackend,
    $state,
    $stateParams,
    $scope,
    controller, 
    timesheet,
    timeunits,
    employee,
    spies,
    api;
 
  describe('Controllers', function() {
      
    beforeEach(
      module(
        'ui.router',
        'app.resources',
        'ngResource',
        'security.services',
        'notifications.services',
        'app.timesheets.timeunits',
        'app.timesheets',
        'app.timesheets.controllers'
      ));

    beforeEach(inject(function (_$rootScope_, _$httpBackend_, _$controller_, _$state_, _$stateParams_){
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      $controller = _$controller_;
      $state = _$state_;
      $stateParams = _$stateParams_;
    }));

    beforeEach(inject(function ($injector) {
      api = $injector.get('api');
      $stateParams.user_id = "1234567890";

      timesheet = {
        "_id": "asdfghjklqwerty",
        "name": "TestTimesheet",
        "beginDate": "2013-11-18",
        "endDate": "2013-11-24",
        "description": "Test timesheet for testing",
        "user_id": "1234567890"
      };

      timeunits = [
        {"_id": "aaaaaaaaaa", "dateWorked": "2013-11-18", "hoursWorked": 8, "project": "Project1"},
        {"_id": "bbbbbbbbbb", "dateWorked": "2013-11-19", "hoursWorked": 8, "project": "Project1"},
        {"_id": "cccccccccc", "dateWorked": "2013-11-20", "hoursWorked": 8, "project": "Project1"},
        {"_id": "dddddddddd", "dateWorked": "2013-11-21", "hoursWorked": 8, "project": "Project2"},
        {"_id": "eeeeeeeeee", "dateWorked": "2013-11-22", "hoursWorked": 8, "project": "Project1"}
      ];

      var notifications = $injector.get('notifications');

      spies = {
        error: sinon.spy(notifications, 'error'),
        success: sinon.spy(notifications, 'success'),
        state: sinon.stub($state)
      };
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    describe('TimesheetCtrl', function() {

      beforeEach(function() {
        $scope = $rootScope.$new();
        controller = $controller("TimesheetCtrl", { 
          $scope: $scope,
          $state: spies.state,
          $stateParams: $stateParams 
        });

        $httpBackend.when('GET', '/users/1234567890/timesheets?page=1&sort=%7B%22beginDate%22:1%7D').respond(200);
        $httpBackend.when('GET', '/users/1234567890/timesheets?page=2&sort=%7B%22beginDate%22:1%7D').respond(200, {name: 'pageConfig2'});
      });

      describe('during setup', function () {
        it('should be able to instantiate the controller and request a page of timesheets', function () { 
          expect(controller).to.be.ok; 
          // $scope.requestTimesheets is called upon controller creation
          $httpBackend.expect('GET', '/users/1234567890/timesheets?page=1&sort=%7B%22beginDate%22:1%7D');
          $httpBackend.flush();
        });
      }); 

      describe('requesting timesheets', function () {
        it('should set the result to the pageConfig object', function () {
          $httpBackend.expect('GET', '/users/1234567890/timesheets?page=2&sort=%7B%22beginDate%22:1%7D');
          $scope.requestTimesheets(2);
          $httpBackend.flush();
          expect($scope.pageConfig.name).to.equal("pageConfig2");
        }); 
      });

      describe('showing timesheet detail', function () {
        it('should notify the user if the timesheet is deleted', function () {
          timesheet.deleted = true;
          $httpBackend.flush();
          $scope.showDetail(timesheet);
          expect(spies.error).to.have.been.calledWith('You cannot edit a deleted timesheet.');
        });
        it('should transition to the timesheet detail state', function () {
          $httpBackend.flush();
          $scope.showDetail(timesheet);
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail', timesheet);
        });
      });

      describe('creating a new timesheet', function () {
        it('should transition to the create timesheet state', function () {
          $httpBackend.flush();
          $scope.createNew();
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.create');
        });
      });

      describe('removing a timesheet', function () {

        it('should send a remove request for the specified timesheet', function () {
          $httpBackend.flush();
          $httpBackend.expect('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(200);
          $scope.remove(timesheet);
          $httpBackend.flush();
        });

        describe('successfully', function () {
          beforeEach(function () {
            $httpBackend.flush();
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(200);
          });

          it('should set the timesheet to deleted for the ui', function () {
            $scope.remove(timesheet);
            $httpBackend.flush();
            expect(timesheet.deleted).to.be.true;
          });
          it('should notify the user of the deletion', function () {
            $scope.remove(timesheet);
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          beforeEach(function () {
            $httpBackend.flush();
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(500);
          });

          it('should set deleted to false for the timesheet in the ui', function () {
            $scope.remove(timesheet);
            $httpBackend.flush();
            expect(timesheet.deleted).to.be.false;
          });
          it('should notify the user of the error', function () {
            $scope.remove(timesheet);
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });

      });

      describe('restore', function () {
        beforeEach(function () {
          timesheet.deleted = true;
        });

        it('should send a restore request for the specified timesheet', function () {
          $httpBackend.flush();
          $httpBackend.expect('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(200);
          $scope.restore(timesheet);
          $httpBackend.flush();
        });

        describe('successfully', function () {
          beforeEach(function () {
            $httpBackend.flush();
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(200);
          });

          it('should set the timesheet to not deleted for the ui', function () {
            $scope.restore(timesheet);
            $httpBackend.flush();
            expect(timesheet.deleted).to.be.false;
          });
          it('should notify the user of the deletion', function () {
            $scope.restore(timesheet);
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          beforeEach(function () {
            $httpBackend.flush();
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(500);
          });

          it('should set deleted to true for the timesheet in the ui', function () {
            $scope.restore(timesheet);
            $httpBackend.flush();
            expect(timesheet.deleted).to.be.true;
          });
          it('should notify the user of the error', function () {
            $scope.restore(timesheet);
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });
      });

    });

    describe('TimesheetDetailCtrl', function() {
      var timeunit;
      
      beforeEach(function() {

        $scope = $rootScope.$new();
        controller = $controller("TimesheetDetailCtrl", {
          $scope: $scope,
          timesheet: new api.timesheets(timesheet),
          timeunits: timeunits,
          $state: spies.state,
          $stateParams: $stateParams
        });

        timeunit = angular.extend(timeunits[0], {user_id: '1234567890', timesheet_id: timesheet._id});
      });

      describe('setup', function () {
        it('should be able to instantiate the controller', function () {
          expect(controller).to.be.ok;
        });

        it('should set the timesheet on scope to the resolved timesheet', function () {
          expect($scope.timesheet._id).to.equal(timesheet._id);
          expect($scope.timesheet.name).to.equal(timesheet.name);
        });
      });

      describe('edit', function () {
        it('should transition to the edit state', function () {
          $scope.edit(timesheet);
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail.edit', $stateParams);
        }); 
      });

      describe('cancel', function () {
        it('should return back to the timesheet list', function () {
          $scope.cancel();
          expect(spies.state.go).to.have.been.calledWith('app.timesheets');
        });
      });

      describe('logTime', function () {
        it('should transition to the create timeunits state', function () {
          $scope.logTime();
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail.timeunits.create', $stateParams);
        });
      });

      describe('showTimeunitDetail', function () {
        it('should set the timeunit_id on state params and transistion to the edit timeunits state', function () {
          $scope.showTimeunitDetail({_id: 'abc'});
          expect($stateParams.timeunit_id).to.equal('abc');
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail.timeunits.edit');
        });
      }); 

      describe('removeTimeunit', function () {
        it('should send a remove request for the specified timeunit', function () {
          $httpBackend.expect('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(200);
          $scope.removeTimeunit(timeunit);
          $httpBackend.flush();
        });

        describe('successfully', function () {
          beforeEach(function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(200);
          });

          it('should set the timeunit to deleted for the ui', function () {
            $scope.removeTimeunit(timeunit);
            $httpBackend.flush();
            expect(timeunit.deleted).to.be.true;
          });
          it('should notify the user of the deletion', function () {
            $scope.removeTimeunit(timeunit);
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          beforeEach(function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(500);
          });

          it('should set deleted to false for the timeunit in the ui', function () {
            $scope.removeTimeunit(timeunit);
            $httpBackend.flush();
            expect(timeunit.deleted).to.be.false;
          });
          it('should notify the user of the error', function () {
            $scope.removeTimeunit(timeunit);
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });
      });

      describe('restoreTimeunit', function () {
        beforeEach(function () {
          timeunit.deleted = true;
        });

        it('should send a restore request for the specified timeunit', function () {
          $httpBackend.expect('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(200);
          $scope.restoreTimeunit(timeunit);
          $httpBackend.flush();
        });

        describe('successfully', function () {
          beforeEach(function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(200);
          });

          it('should set the timeunit to not deleted for the ui', function () {
            $scope.restoreTimeunit(timeunit);
            $httpBackend.flush();
            expect(timeunit.deleted).to.be.false;
          });
          it('should notify the user of the deletion', function () {
            $scope.restoreTimeunit(timeunit);
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          beforeEach(function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/asdfghjklqwerty/timeunits/aaaaaaaaaa').respond(500);
          });

          it('should set deleted to true for the timeunit in the ui', function () {
            $scope.restoreTimeunit(timeunit);
            $httpBackend.flush();
            expect(timeunit.deleted).to.be.true;
          });
          it('should notify the user of the error', function () {
            $scope.restoreTimeunit(timeunit);
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });
      });
    });

    describe('TimesheetEditCtrl', function() {
      beforeEach(function() {
        spies.state.current = {data: {saveText: 'update'}};

        $scope = $rootScope.$new();
        controller = $controller("TimesheetEditCtrl", {
          $scope: $scope,
          timesheet: new api.timesheets(timesheet),
          $state: spies.state
        });
      });

      describe('setup', function () {
        it('should be able to instantiate the controller', function () {
          expect(controller).to.be.ok;
        });

        it('should set saveText to the current state saveText', function () {
          expect($scope.saveText).to.equal('update');
        });

        it('should set the timesheet on scope to the resolved timesheet', function () {
          expect($scope.timesheet._id).to.equal(timesheet._id);
          expect($scope.timesheet.name).to.equal(timesheet.name);
        });
      });

      describe('Saving an edited timesheet', function () {
        var updatedTimesheet;

        beforeEach(function () {
          updatedTimesheet = angular.extend(timesheet, {name: 'updated'});
          $httpBackend.expect('PUT', '/users/1234567890/timesheets/' + timesheet._id);
        });

        describe('with success', function () {

          beforeEach(function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(200, updatedTimesheet);
          });

          it('should set the timesheet on scope to be the updated timesheet', function () {
            $scope.save();
            $httpBackend.flush();
            expect($scope.timesheet.name).to.equal(updatedTimesheet.name);
          });

          it('should notify the user of the successful update', function () {
            $scope.save();
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          it('should notify the user of the error', function () {
            $httpBackend.when('PUT', '/users/1234567890/timesheets/' + timesheet._id).respond(500);
            $scope.save();
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });

      });

      describe('cancel', function () {
        it('should return back to the timesheet detail', function () {
          $scope.cancel();
          expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail');
        });
      });
    });

    describe('TimesheetCreateCtrl', function() {

      beforeEach(function() {
        spies.state.current = {data: {saveText: 'create'}};

        $scope = $rootScope.$new();
        controller = $controller("TimesheetCreateCtrl", {
          $scope: $scope,
          $state: spies.state,
          $stateParams: $stateParams
        });
      });

      describe('setup', function () {
        it('should be able to instantiate the controller', function () {
          expect(controller).to.be.ok;
        });

        it('should set saveText to the current state saveText', function () {
          expect($scope.saveText).to.equal('create');
        });
        
        it('should set the timesheet on scope to an empty object', function () {
          expect($scope.timesheet).to.be.empty;
        });
      }); 

      describe('saving a new timesheet', function () {

        beforeEach(function () {
          $httpBackend.expect('POST', '/users/1234567890/timesheets');
        });

        describe('with success', function () {

          beforeEach(function () {
            $httpBackend.when('POST', '/users/1234567890/timesheets').respond(200, timesheet);
            });

          it('should transition to the detail page of the created timesheet', function () {
            $scope.save();
            $httpBackend.flush();
            expect(spies.state.go).to.have.been.calledWith('app.timesheets.detail', {user_id: $stateParams.user_id, _id: timesheet._id});
          });

          it('should notify the user of the successful create', function () {
            $scope.save();
            $httpBackend.flush();
            expect(spies.success).to.have.been.called;
            expect(spies.error).to.not.have.been.called;
          });
        });

        describe('in error', function () {
          it('should notify the user of the error', function () {
            $httpBackend.when('POST', '/users/1234567890/timesheets').respond(500);
            $scope.save();
            $httpBackend.flush();
            expect(spies.error).to.have.been.called;
            expect(spies.success).to.not.have.been.called;
          });
        });
      });

      describe('cancel', function () {
        it('should return back to the timesheet list', function () {
          $scope.cancel();
          expect(spies.state.go).to.have.been.calledWith('app.timesheets');
        });
      });

    });

  });
});
