import { Component, OnInit, Inject } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { College } from 'app/main/models/college';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import *  as moment from 'moment';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';

export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-exam-sessions-modal',
  templateUrl: './exam-sessions-modal.component.html',
  styleUrls: ['./exam-sessions-modal.component.scss'],
  providers: [
    // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
    // application's root module. We provide it at the component level here, due to limitations of
    // our example generation script.
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})

export class ExamSessionsModalComponent implements OnInit {

  private collegeWiseDetails = CONSTANTS.collegeWiseDetailsUrl;

  filtersDetailsList = [];
  filtersdata = [];
  colleges: College[] = [];
  sessionsIn: College[] = [];
  dialogTitle;
  marksSetupForm: FormGroup;
  startTime: any = {};
  endTime: any = {};
  time;
  hours;
  minutes;
  seconds;
  meridian;
  date;
  universities = [];

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {
    this.getfilterDetails();
  }

  ngOnInit(): void {
    this.date = this.genericFunctions.moment();
    this.dialogTitle = 'Add Exam Session';
    this.marksSetupForm = this.formBuilder.group({
      examSessionName: ['', Validators.required],
      // collegeId: ['', Validators.required],
      universityId: ['', Validators.required],
      startTime: [],
      endTime: [],
      examsessioninCatId: [],
      isActive: [],
      reason: []
    });

    // tslint:disable-next-line: no-unused-expression
    this.startTime = { hour: 9, minute: 0, meriden: 'AM', format: 12 };
    // tslint:disable-next-line: no-unused-expression
    this.endTime = { hour: 10, minute: 0, meriden: 'AM', format: 12 };

    this.marksSetupForm.get('isActive').setValue(true);
    this.marksSetupForm.get('reason').setValue('active');

    if (!this.isEmptyObject(this.data)) {
      this.marksSetupForm.get('examSessionName').setValue(this.data.examSessionName);
      // this.marksSetupForm.get('collegeId').setValue(this.data.collegeId);
      this.marksSetupForm.get('universityId').setValue(this.data?.universityId);
      this.marksSetupForm.get('examsessioninCatId').setValue(this.data?.examsessioninCatId);
      this.marksSetupForm.get('endTime').setValue(this.data?.sessionEndTime);
      this.marksSetupForm.get('isActive').setValue(this.data?.isActive);
      this.marksSetupForm.get('reason').setValue(this.data?.reason);
      this.startTime = this.data?.sessionStartTime;
      this.endTime = this.data?.sessionEndTime;
      this.dialogTitle = 'Edit Exam Session';
      if (this.data.sessionStartTime !== null && this.data.sessionEndTime !== null) {
        //   this.startTime = this.tConvert(this.startTime).split(':')[0];
        // this.endTime = {  hour: this.tConvert(this.endTime).split(':')[0], 
        // minute: this.tConvert(this.endTime).split(':')[1], 
        // meriden: this.tConvert(this.endTime).split(':')[2], format: 12 };
        this.startTime = {
          hour: this.tConvert(this.startTime).split(':')[0],
          minute: this.tConvert(this.startTime).split(':')[1],
          meriden: this.tConvert(this.startTime).split(':')[2], format: 12
        };
        this.endTime = {
          hour: this.tConvert(this.endTime).split(':')[0],
          minute: this.tConvert(this.endTime).split(':')[1],
          meriden: this.tConvert(this.endTime).split(':')[2], format: 12
        };
      }
    }
  }
  getfilterDetails() {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'clg_filters,gm_codes' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_group_section_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_dept_id', paramValue: 0 },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_subject', paramValue: '' },
      { paramName: 'in_employee', paramValue: '' },
      { paramName: 'in_gm_codes', paramValue: 'EXMSESN' },
    ];
    this.crudService.getDetailsByRequest(this.collegeWiseDetails, '', request, '&')
      .subscribe(result => {
        if (result.statusCode === 200) {
          this.spinner.hide()
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'clg_filters') {
                this.filtersdata = this.filtersDetailsList[i];
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'gm_codes') {
                this.sessionsIn = this.filtersDetailsList[i];
              }
            }
            /*----------- DISTINCT COLLEGE-----------*/
            const universityList = this.filtersdata.map(({ fk_university_id }) => fk_university_id);
            this.universities = this.filtersdata.filter(({ fk_university_id }, index) =>
              !universityList.includes(fk_university_id, index + 1));
          } else {
            this.snotifyService.success(result.message, 'Success!');
          }
        } else {
          this.spinner.hide()
          this.snotifyService.error(result.message, 'Error!');
        }
      }, error => {
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
  tConvert(time): any {
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
    if (time.length > 1) { // If time format correct
      time = time.slice(1);  // Remove full string match value
      time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
      time[2] = +time[2];
    }
    time = time[0] + time[1] + time[2] + time[1] + time[5];
    return time;
  }
  // tslint:disable-next-line: variable-name
  convert_to_24h(time_str): any {
    // Convert a string like 10:05:23 PM to 24h format, returns like [22,5,23]
    this.time = time_str.match(/(\d+):(\d+):(\d+) (\w)/);
    this.hours = Number(this.time[1]);
    this.minutes = Number(this.time[2]);
    this.seconds = Number(this.time[3]);
    this.meridian = this.time[4].toLowerCase();
    if (this.meridian === 'p' && this.hours < 12) {
      this.hours += 12;
    }
    else if (this.meridian === 'a' && this.hours === 12) {
      this.hours -= 12;
    }
    return this.hours + ':' + this.minutes + ':' + '00';
  }
  submit(): void {
    const Obj = this.marksSetupForm.value;
    Obj.sessionStartTime = this.convert_to_24h(this.startTime.hour + ':' + this.startTime.minute + ':00 ' + this.startTime.meriden);
    Obj.sessionEndTime = this.convert_to_24h(this.endTime.hour + ':' + this.endTime.minute + ':00 ' + this.endTime.meriden);
    if (this.marksSetupForm.invalid) {
      return;
    } else {
      this.dialogRef.close(Obj);
    }
  }
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  // tslint:disable-next-line: typedef
  chosenYearHandler(normalizedYear: moment.Moment) {
    const ctrlValue = this.date.value;
    ctrlValue.year(normalizedYear.year());
    this.date.setValue(ctrlValue);
  }
  // tslint:disable-next-line: typedef
  chosenMonthHandler(normalizedMonth: moment.Moment, datepicker: MatDatepicker<moment.Moment>) {
    const ctrlValue = this.date.value;
    ctrlValue.month(normalizedMonth.month());
    this.date.setValue(ctrlValue);
    datepicker.close();
  }
}