import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';



@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent implements OnInit {

  dialogTitle;
  examDate;
  panelOpenState = true;
  questionJson: any = {};
  public formData;
  meetingFromTime = { hour: 11, minute: 0, meriden: 'AM' ,format: 12, };
  time;
  hours;
  minutes;
  seconds;
  meridian;
  evaluatorForm:FormGroup
  meetingFromTime1: any;
  constructor(private route: ActivatedRoute, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ConfirmModalComponent>,
               @Inject(MAT_DIALOG_DATA) public details, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService)
                {

  }
  ngOnInit(): void {
    this.meetingFromTime1=this.details.published_time.split(':')
    if(this.meetingFromTime1[0]>12){
      this.meetingFromTime = { hour: this.meetingFromTime1[0], minute: this.meetingFromTime1[1],meriden: 'PM' , format: 12,};
    }
    else{
      this.meetingFromTime = { hour: this.meetingFromTime1[0], minute: this.meetingFromTime1[1],meriden: 'AM' , format: 12, };
    }

    this.evaluatorForm = this.formBuilder.group({
      examDate: [this.details.published_date, Validators.required],
      examTime: [this.details.published_time, Validators.required],

    })
    this.evaluatorForm.get('examDate').disable();
    this.evaluatorForm.get('examTime').disable();


  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}

submit(){
  const obj={
   Date: this.examDate,
  //  Time: this.convert_to_24h(this.meetingFromTime.hour + ':' + this.meetingFromTime.minute + ':00 ' + this.meetingFromTime.meriden)
  }
  this.dialogRef.close(this.evaluatorForm.value.examDate);
}
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
  return (this.hours < 10 ? '0'+this.hours : this.hours) + ':' + (this.minutes == 0 ? '00' : this.minutes) + ':' + '00';
}
}
