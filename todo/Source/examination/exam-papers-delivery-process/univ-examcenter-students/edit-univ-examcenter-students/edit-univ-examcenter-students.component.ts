import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-edit-univ-examcenter-students',
  templateUrl: './edit-univ-examcenter-students.component.html',
  styleUrls: ['./edit-univ-examcenter-students.component.scss']
})
export class EditUnivExamcenterStudentsComponent implements OnInit {

  private UnivExamRegionalCentersUrl = CONSTANTS.UnivExamRegionalCentersUrl;
  private citiesCrudUrl = CONSTANTS.citiesCrudUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;

  examCenterForm: FormGroup;
  dialogTitle = '';

  examlCenterList = [];

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<EditUnivExamcenterStudentsComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private router: Router,
    private crudService: CrudService, private genericFunctions: GenericFunctions) {
    this.getData();

  }

  ngOnInit(): void {
    this.examCenterForm = this.formBuilder.group({
      univExamCentersId: ['', Validators.required],
      isActive: [true],
      reason: []

    });
    if (!this.isEmptyObject(this.data)) {
      this.examCenterForm.get('univExamCentersId').setValue(this.data?.univExamCentersId);
      this.examCenterForm.get('isActive').setValue(this.data?.isActive);
      this.examCenterForm.get('reason').setValue(this.data?.reason);
      this.examCenterForm.get('univExamCentersId').setValue(this.data?.univExamCentersId);
      this.dialogTitle = 'Edit Exam Center Student';

    }
  }
  getData() {
    this.examlCenterList = [];
    this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.examlCenterList = result.data.resultList;
          } else {
            this.snotifyService.success(result.message, 'Success!');
          }
        } else {
          this.snotifyService.error(result.message, 'Error!');
        }

      }, error => {
        if (error.error.statusCode === 401) {

          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url + '&loadForm=true');
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  submit(): void {
    if (this.examCenterForm.invalid) {
      return;
    } else {
      this.data.isActive = this.examCenterForm.value.isActive,
        this.data.reason = this.examCenterForm.value.reason,
        this.data.updatedUser = +localStorage.getItem('employeeId'),
        this.dialogRef.close(this.data);
    }
  }
}