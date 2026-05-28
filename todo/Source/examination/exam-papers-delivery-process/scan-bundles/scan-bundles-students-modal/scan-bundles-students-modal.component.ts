import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';

@Component({
  selector: 'app-scan-bundles-students-modal',
  templateUrl: './scan-bundles-students-modal.component.html',
  styleUrls: ['./scan-bundles-students-modal.component.scss']
})
export class ScanBundlesStudentsModalComponent implements OnInit {

  private getExamCenterDetailsUrl = CONSTANTS.getExamCenterDetailsUrl;

  searchText = '';
  examCenterStudents = [];
  selectAll: boolean = false;
  selectedStudents: any[] = [];

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ScanBundlesStudentsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {
            this.getCenterStudents();
  }

  ngOnInit(): void {

  }

getCenterStudents() {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_scan_bundle_details' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.data?.univEcId },
      { paramName: 'in_exam_group_id', paramValue: this.data?.examGroupId },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.data?.examId },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: this.data?.courseYearId },
      { paramName: 'in_regulation_id', paramValue: this.data?.regulationId },
      { paramName: 'in_subject_id', paramValue: this.data?.subjectId },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterStudents = result.data.result[0];
            this.examCenterStudents.forEach(student => {
              student.selected = student.registration_flag === 1;
            });
          }
        } else {
          this.snotifyService.error(result.message, 'Error!');
        }
      }, error => {
        this.spinner.hide();
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');
          this.genericFunctions.logOut(this.router.url);
        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });
  }
toggleSelectAll(event: any) {
  const checked = event.checked;

  this.examCenterStudents.forEach(student => {
    student.selected = checked;

    if (student.registration_flag === 1 && !checked) {
      student.isActive = false;
    }

    if (checked) {
      student.isActive = true;
    }
  });

  this.prepareSelectedJson();
}
onStudentChange(student: any) {

  // ✅ If previously assigned and now unchecked
  if (student.registration_flag === 1 && !student.selected) {
    student.isActive = false;
  }

  // ✅ If checked again → make active
  if (student.selected) {
    student.isActive = true;
  }

  // Update Select All checkbox
  this.selectAll = this.examCenterStudents.every(s => s.selected);

  this.prepareSelectedJson();
}
prepareSelectedJson() {
  this.selectedStudents = this.examCenterStudents
    .filter(s => s.selected || s.isActive === false) // include unselected inactive
    .map(s => ({
      univExamScanbundleId: this.data.univExamScanbundleId,
      univExamScanbundleDetId: s.univExamScanbundleDetId,
      examStdDetId: s.studentDetailId,
      omrSerialNo: s.omr_serial_no,
      isActive: s.selected ? true : false
    }));

  console.log('Final JSON:', this.selectedStudents);
}
submit(){
  this.dialogRef.close(this.selectedStudents);
}
}
