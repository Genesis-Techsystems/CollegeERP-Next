import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-exam-center-courses-modal',
  templateUrl: './exam-center-courses-modal.component.html',
  styleUrls: ['./exam-center-courses-modal.component.scss']
})
export class ExamCenterCoursesModalComponent implements OnInit {
  examCenterForm: FormGroup;
  dialogTitle = '';
  examlCenterList = [];
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterCoursesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
    private crudService: CrudService, private genericFunctions: GenericFunctions) {

  }
  ngOnInit(): void {
    this.examCenterForm = this.formBuilder.group({
      isActive: [true],
      reason: []

    });
    console.log(this.data,'this.data');
    
    if (!this.isEmptyObject(this.data)) {
      // this.examCenterForm.get('isActive').setValue(this.data?.isActive);
      this.examCenterForm.get('reason').setValue(this.data?.reason);
      this.dialogTitle = 'Edit Exam Center College';

    }
  }

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  submit(): void {
    if (this.examCenterForm.invalid) {
      return;
    } else {
      const obj={
        isActive: this.examCenterForm.value.isActive,
        reason:this.examCenterForm.value.reason,
        updatedUser:+localStorage.getItem('employeeId'),
        courseGroupId :this.data.fk_course_group_id,
        courseYearId:this.data.fk_course_year_id,
        univEcCollegeDetailId:this.data.pk_univ_ec_collegedetail_id,
        subjectId :this.data.fk_subject_id,
        univEcCollegeId:this.data.fk_univ_ec_college_id
      }
      // this.data.isActive = this.examCenterForm.value.isActive,
      //   this.data.reason = this.examCenterForm.value.reason,
      //   this.data.updatedUser = +localStorage.getItem('employeeId'),
        this.dialogRef.close(obj);
    }
  }
}