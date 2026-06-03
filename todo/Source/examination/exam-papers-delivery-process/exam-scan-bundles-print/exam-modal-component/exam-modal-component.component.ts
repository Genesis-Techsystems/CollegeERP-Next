import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { ScanBundlesModalComponent } from '../../scan-bundles/scan-bundles-modal/scan-bundles-modal.component';

@Component({
  selector: 'app-exam-modal-component',
  templateUrl: './exam-modal-component.component.html',
  styleUrls: ['./exam-modal-component.component.scss']
})
export class ExamModalComponentComponent implements OnInit {

 private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;
  private getExamCenterDetailsUrl = CONSTANTS.getExamCenterDetailsUrl;

  addScanBundleForm: FormGroup;
  colleges = [];
  employees: any[] = [];
  dialogTitle;
  searchEmployees: any[] = [];
  flag: boolean;
  universityColleges = [];
  regulationSubjects = [];
  courseYearsList = [];
  courseYears = [];
  regulationFilterList = [];
  regulationList = [];
  subjectsList = [];
  subjects = [];
  subjectsData = [];
  examsubjectStudents = [];
  filteredScanProfiles: any[] = [];
  scanProfileDetails = [];
  scanProfileDetailsList = [];
  examScanprofilesList = [];
  scanProfiles = [];

  Obj: any = {};
  dataDetails: string;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ScanBundlesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {

  }

  ngOnInit(): void {
    this.dialogTitle = 'Add Exam Bundles';
    this.addScanBundleForm = this.formBuilder.group({
      courseYearId : [],
      regulationId : [],
      subjectId : [],
      bundleNumber : [''],
      scannerProfileDetailId : [''],
      totalAnswerBooks: [''],
      startEcSeatNo : [''],
      endEcSeatNo : [''],
      isActive : [true],
      reason : [''],
    });
    //this.addScanBundleForm.get('isActive').setValue(true);
    console.log(this.data,"this.data");
    if (!this.isEmptyObject(this.data)) {
        if(this.data.pk_univ_exam_scan_bundle_id){
           this.dialogTitle = 'Edit Scan Bundles';
           this.addScanBundleForm.get('bundleNumber').setValue(this.data?.bundle_number);
           this.addScanBundleForm.get('scannerProfileDetailId').setValue(this.data?.scannerProfileDetailId);
           this.addScanBundleForm.get('totalAnswerBooks').setValue(this.data?.totalAnswerBooks);
          //  this.addScanBundleForm.get('startEcSeatNo').setValue(this.data?.startEcSeatNo);
          //  this.addScanBundleForm.get('endEcSeatNo').setValue(this.data?.endEcSeatNo);
           this.addScanBundleForm.get('isActive').setValue(this.data?.isActive??true);
           this.addScanBundleForm.get('reason').setValue(this.data?.reason);
        }
    }
    this.selectedData()
    this.getScanProfiles();
  }
 selectedData() {
    this.dataDetails = '';

    if (this.data?.examGroupCode) {
      this.dataDetails = this.data?.examGroupCode;
    }
    if (this.data?.examCenterCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.data?.examCenterCode;
    }
    if (this.data?.examDate) {
      this.dataDetails = this.dataDetails + ' / ' + this.data?.examDate;
    }
    if (this.data.questionPaperCode) {
      this.dataDetails = this.dataDetails + ' / ' + this.data.questionPaperCode;
    }
       if (this.data.scan_bundle_name) {
      this.dataDetails = this.dataDetails + ' / ' + this.data.scan_bundle_name;
    }
  }
  getFilterDetails(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'college_center_subject_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: this.data.examGroupId },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.courseYearsList = result.data.result[0];
            const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
          }
          if (this.courseYears.length > 0) {
            if(this.data.univExamScanbundleId !== null){
           this.addScanBundleForm.get('courseYearId').setValue(this.data?.courseYearId?.toString());
      this.selectedYear(this.addScanBundleForm.value.courseYearId);
          }else{
            this.addScanBundleForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.addScanBundleForm.value.courseYearId);
          }
    } else {
            this.snotifyService.success(result.message, 'Success!');
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
    selectedYear(courseYearId) {
    this.addScanBundleForm.get('subjectId').setValue('');
    this.addScanBundleForm.get('regulationId').setValue('');
    this.regulationFilterList = [];
    this.regulationList = [];
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.flag = false;
    this.regulationFilterList = this.courseYearsList.filter(x => (x.fk_course_year_id === this.addScanBundleForm.value.courseYearId));
    if (this.regulationFilterList.length > 0) {
      const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulationList.length > 0) {
      if(this.data.univExamScanbundleId !== null){
           this.addScanBundleForm.get('regulationId').setValue(this.data?.regulationId);
      this.selectedRegulation(this.addScanBundleForm.value.regulationId);
      }else{
this.addScanBundleForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
      this.selectedRegulation(this.addScanBundleForm.value.regulationId);
      }
    }
  }
  selectedRegulation(regulationId){
    this.addScanBundleForm.get('subjectId').setValue('');
    this.subjectsList = [];
    this.subjects = [];
    this.subjectsData = [];
    this.examsubjectStudents = [];
    this.flag = false;
    if (regulationId !== '' || regulationId !== null) {
      this.subjectsList = this.courseYearsList.filter(x => (x.fk_course_year_id === this.addScanBundleForm.value.courseYearId && x.fk_regulation_id === this.addScanBundleForm.value.regulationId));
      if (this.subjectsList && this.subjectsList.length > 0) {
        const courseCodeData = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
        this.subjects = this.subjectsList.filter(({ fk_subject_id }, index) =>
          !courseCodeData.includes(fk_subject_id, index + 1));
        this.subjectsData = this.subjects;
      }
      if (this.subjects && this.subjects.length > 0) {
        if(this.data.univExamScanbundleId !== null){
           this.addScanBundleForm.get('subjectId').setValue(this.data?.subjectId);
        }else{
          this.addScanBundleForm.get('subjectId').setValue(this.subjects[0]?.fk_subject_id);
        }
      }
    }
  }

  getScanProfiles() {
    this.examScanprofilesList = [];
    this.scanProfiles = [];
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_scan_profile_details' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: this.data.examGroupId },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_questionpaper_code', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
    ];
    this.crudService.getDetailsByRequest(this.getExamCenterDetailsUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examScanprofilesList = result.data.result[0];
            const scanProfiles = this.examScanprofilesList.map(({ pk_exam_scan_profile_id }) => pk_exam_scan_profile_id);
            this.scanProfiles = this.examScanprofilesList.filter(({ pk_exam_scan_profile_id }, index) => !scanProfiles.includes(pk_exam_scan_profile_id, index + 1));
          }
          this.filteredScanProfiles = [...this.scanProfiles];
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

  searchScanProfile(value: string) {
  if (!value) {
    this.filteredScanProfiles = [...this.scanProfiles];
    return;
  }

  const filter = value.toLowerCase();

  this.filteredScanProfiles = this.scanProfiles.filter(obj =>
    obj.scan_profile_name?.toLowerCase().includes(filter)
  );
}

  searchdata(value) {
    this.subjectsData = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.subjectsData.push(option);
      }
    }
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  submit(): void {
    if (this.addScanBundleForm.valid) {
      this.dialogRef.close(this.addScanBundleForm.value);
    }
  }

}
