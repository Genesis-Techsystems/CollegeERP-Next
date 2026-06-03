import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { ExamCenterCoursesModalComponent } from './exam-center-courses-modal/exam-center-courses-modal.component';

@Component({
  selector: 'app-exam-center-courses',
  templateUrl: './exam-center-courses.component.html',
  styleUrls: ['./exam-center-courses.component.scss']
})
export class ExamCenterCoursesComponent implements OnInit {

  private UnivEcCollegeDetailsUrl = CONSTANTS.UnivEcCollegeDetailsUrl;
  private isActive = CONSTANTS.isActive;
  private addUnivEcCollegeDetailsUrl = CONSTANTS.addUnivEcCollegeDetailsUrl;
  private updateInActiveUnivEcCollegeDetailsUrl = CONSTANTS.updateInActiveUnivEcCollegeDetailsUrl;
  private getCollegeExamCenters = CONSTANTS.getCollegeExamCenters;

  filtersDetailsList = [];
  CollegesListDetails = [];
  regulationDetailsList = [];
  courses = [];
  academicYears = []
  searchExams = [];
  examsList = [];
  academicYearsList = [];
  examData = [];
  examsLists = [];
  univExamCenters = [];
  colleges = [];
  collegeLists = [];
  selectedCount = 0;
  selectedColleges = [];
  checkCollege: boolean;
  examColleges = [];
  examCenterColleges = [];
  staffForm: FormGroup;
  courseName: any;
  academicYearName: any;
  examsName: any;
  panelOpenState = true;
  step = 0;
  flag = false;
  courseYears: any[] = [];
  subjects: any[] = [];
  selectedCourseGroup: any = null;
  selectedCourseYears: any[] = [];
  selectedSubjects: any[] = [];
  courseYearList = [];
  centerFiltersDetailsList = [];
  centerCollegesListDetails = [];
  regulations = [];
  univEcCollegeId: any;
  ExamCentersCollegesList = [];
  displayedColumns: string[] = ['id', 'group', 'courseYear', 'subject', 'Actions'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  courseGroupSubjectsDetails = [];
  ExamCentersColleges = [];
  courseGroupsList = [];
  courseGroups = [];
  subjectListDetails = [];
  subjectsList=[];
  ExistssubjectListDetails=[]
  examCenterFilters = [];
  examCenterDetails = [];
  examGroupList = [];
  examGroups = [];
  dataDetails = '';
  examCenterName: any;
  examCenterCollege: any;
  examGroup: any;
  courseYear: any;
  regulationCode: any;
  searchText = '';
  searchText1 = '';
  searchText2 = '';

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {
           this.getExamCenters();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      univEcCollegeId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      examGroupId: ['', Validators.required],
      regulationId: ['', Validators.required],
      courseGroupId: new FormControl(null, Validators.required),
      courseYearId: new FormControl(null, Validators.required)
    });
    this.dataSource = new MatTableDataSource(this.examCenterColleges);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getExamCenters(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'college_center_exam_group_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.examCenterFilters = result.data.result;
            this.examCenterDetails = result.data.result[0];
            // for (let i = 0; i < this.examCenterFilters.length; i++) {
            //   if (this.examCenterFilters[i].length > 0 && this.examCenterFilters[i][0].flag === 'college_center_exam_group_filters') {
            //     this.examCenterDetails = this.examCenterFilters[i];
            //   }
            // }
            const univExamCentersList = this.examCenterDetails.map(({ fk_univ_ec_id }) => fk_univ_ec_id);
            this.univExamCenters = this.examCenterDetails.filter(({ fk_univ_ec_id }, index) =>
              !univExamCentersList.includes(fk_univ_ec_id, index + 1));
          }
          if (this.univExamCenters.length > 0) {
            this.staffForm.get('univExamcenterId').setValue(this.univExamCenters[0].fk_univ_ec_id);
            this.selectedExamCenter(this.staffForm.value.univExamcenterId);
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
  selectedExamCenter(univExamcenterId) {
    this.staffForm.get('univEcCollegeId').setValue('');
    this.ExamCentersColleges = [];
    this.ExamCentersCollegesList = [];
    this.filtersDetailsList = [];
    this.CollegesListDetails = [];
    this.regulationDetailsList = [];
    this.courses = [];
    this.ExamCentersColleges = this.examCenterDetails.filter(x => (x.fk_univ_ec_id === this.staffForm.value.univExamcenterId))
    const collegeLists = this.ExamCentersColleges.map(({ fk_college_id }) => fk_college_id);
    this.ExamCentersCollegesList = this.ExamCentersColleges.filter(({ fk_college_id }, index) =>
      !collegeLists.includes(fk_college_id, index + 1));
    if (this.ExamCentersCollegesList.length > 0) {
      this.staffForm.get('univEcCollegeId').setValue(this.ExamCentersCollegesList[0].fk_college_id);
      this.selectedExamCentersColleges(this.staffForm.value.univEcCollegeId);
    }
  }
  selectedExamCentersColleges(univEcCollegeId){
        this.staffForm.get('courseYearId').setValue('');
        this.staffForm.get('regulationId').setValue('');
        this.examGroupList = [];
        this.examGroups = [];
        this.regulationDetailsList = [];
        this.regulations = [];
        this.examGroupList = this.examCenterDetails.filter(x => (x.fk_univ_ec_id == this.staffForm.value.univExamcenterId && x.fk_college_id === this.staffForm.value.univEcCollegeId))
        if (this.examGroupList.length > 0) {
          const examGroupList = this.examGroupList.map(({ fk_univ_exam_group_id }) => fk_univ_exam_group_id);
          this.examGroups = this.examGroupList.filter(({ fk_univ_exam_group_id }, index) => !examGroupList.includes(fk_univ_exam_group_id, index + 1));
        }
        if (this.examGroups.length > 0) {
          this.staffForm.get('examGroupId').setValue(this.examGroups[0].fk_univ_exam_group_id);
          this.selectedExamGroup(this.examGroups[0].fk_univ_exam_group_id)
        }
    }
  selectedExamGroup(examGroupId): void {
    this.filtersDetailsList = [];
    this.CollegesListDetails = [];
    this.regulationDetailsList = [];
    this.regulations = [];
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_center_clg_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            this.regulationDetailsList = result.data.result[0];
            // for (let i = 0; i < this.filtersDetailsList.length; i++) {
            //   if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
            //     this.regulationDetailsList = this.filtersDetailsList[i];
            //   }
            // }
            const regulationsList = this.regulationDetailsList.map(({ fk_regulation_id }) => fk_regulation_id);
            this.regulations = this.regulationDetailsList.filter(({ fk_regulation_id }, index) =>
              !regulationsList.includes(fk_regulation_id, index + 1));
          }
          if (this.regulations.length > 0) {
            this.staffForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
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
  selectedRegulation(regulationId) {
    this.ExistssubjectListDetails=[]
    this.courseGroupSubjectsDetails=[]
    this.courseYears = []
    this.subjectListDetails = []
    this.courseGroups = []
    this.headerData();
    this.selectedData();
    let request = [
      { paramName: 'in_flag', paramValue: 'ec_grp_yr_subjects' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          this.courseGroupSubjectsDetails = result.data.result[0];
          if(this.courseGroupSubjectsDetails.length>0){
            this.ExistssubjectListDetails=this.courseGroupSubjectsDetails.filter(x=>(x.row_exists!=0))
            this.dataSource = new MatTableDataSource(this.ExistssubjectListDetails);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
          }else{
            this.snotifyService.success(result.message, 'Success!');
          }
          // this.courseGroupsList = this.courseGroupSubjectsDetails.filter(x => (x.fk_college_id == this.staffForm.value.univEcCollegeId))
          if (this.courseGroupSubjectsDetails.length > 0) {
            const courseGroupsList = this.courseGroupSubjectsDetails.map(({ fk_course_group_id }) => fk_course_group_id);
            this.courseGroups = this.courseGroupSubjectsDetails.filter(({ fk_course_group_id }, index) => !courseGroupsList.includes(fk_course_group_id, index + 1));
          }
          if (this.courseGroups.length > 0) {
            // this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
            this.examColleges = this.courseGroups;
            if(this.selectedSubjects[0]){
               this.onCourseGroupSelect(this.selectedSubjects[0]);
            }
          }
          this.flag = true;
          this.snotifyService.success(result.message, 'Success!');
        }
        else {
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
  headerData() {
    this.examCenterName = this.univExamCenters.filter(x => (x.fk_univ_ec_id == this.staffForm.value.univExamcenterId))[0]?.examcenter_code;
    this.examCenterCollege =this.ExamCentersCollegesList.filter(x => (x.fk_college_id == this.staffForm.value.univEcCollegeId))[0]?.college_code;
    this.examGroup = this.examGroups.filter(x => (x.fk_univ_exam_group_id === this.staffForm.value.examGroupId))[0]?.exam_group_code;
    this.regulationCode =this.regulations.filter(x => (x.fk_regulation_id == this.staffForm.value.regulationId))[0]?.regulation_code;
  }
  selectedData() {
    this.dataDetails = '';
    if (this.examCenterName) {
        this.dataDetails = this.examCenterName;
    }
    if (this.examCenterCollege) {
        this.dataDetails = this.dataDetails + ' / ' + this.examCenterCollege;
    }
    if (this.examGroup) {
        this.dataDetails = this.dataDetails + ' / ' + this.examGroup;
    }
    if (this.regulationCode) {
        this.dataDetails = this.dataDetails + ' / ' + this.regulationCode;
    }
  }
  checkedserialNo(check, item) {
    item.isSelected = check;
    this.selectedCount = 0;
    this.selectedColleges = [];
    for (let i = 0; i < this.examColleges.length; i++) {
      if (this.examColleges[i].isSelected) {
        this.selectedColleges.push(this.examColleges[i]);
        this.selectedCount++;
      }
    }
}
  markItems(): void {
    this.selectedCount = 0;
    this.selectedColleges = [];
    for (let i = 0; i < this.examColleges.length; i++) {
      if (this.checkCollege) {
        this.examColleges[i].checked = true;
        this.examColleges[i].isSelected = true;
        this.selectedColleges.push(this.examColleges[i]);
        this.selectedCount++;
      } else {
        this.examColleges[i].checked = false;
        this.examColleges[i].isSelected = false;
        this.checkCollege = false
        this.selectedColleges = []
      }
    }
  }
  searchOmrNo(value) {
    this.examColleges = []
    this.searchOmrNos(value);
  }
  searchOmrNos(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examColleges.length; i++) {
      let option = this.examColleges[i];
      if (option.college_code.toLowerCase().indexOf(filter) >= 0) {
        this.examColleges.push(option);
      }

    }
  }
  onCourseGroupSelect(group: any) {
    this.courseYears = []
    this.subjectListDetails = []
    if(group.courseGroupId){
      this.staffForm.get('courseGroupId').setValue(group.courseGroupId);
      }
      else{
      this.staffForm.get('courseGroupId').setValue(group.fk_course_group_id);
      }
      
    this.courseYearList = this.courseGroupSubjectsDetails.filter(x => (x.fk_course_group_id == this.staffForm.value.courseGroupId))
    if (this.courseYearList.length > 0) {
      const courseYearList = this.courseYearList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearList.filter(({ fk_course_year_id }, index) => !courseYearList.includes(fk_course_year_id, index + 1));
    }
    if(group.courseGroupId  && this.selectedSubjects[0]){
      this.onCourseYearSelect(this.selectedSubjects[0])
      }
  else if (this.courseYearList.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYearList[0].fk_course_year_id);
      this.onCourseYearSelect(this.courseYearList[0]);

    }
  }
  onCourseYearSelect(courseYear: any) {
    this.subjectListDetails = []
    this.subjectsList=[]
    this.selectedSubjects=[]
    if(courseYear.courseYearId){
    this.staffForm.get('courseYearId').setValue(courseYear.courseYearId);
    }
    else{
      this.staffForm.get('courseYearId').setValue(courseYear.fk_course_year_id);
    }
    this.subjectsList = this.courseGroupSubjectsDetails.filter(x => (x.fk_course_group_id == this.staffForm.value.courseGroupId && x.fk_course_year_id == this.staffForm.value.courseYearId))
    if (this.subjectsList.length > 0) {
      const subjectsList = this.subjectsList.map(({ fk_subject_id }) => fk_subject_id);
      this.subjectListDetails = this.subjectsList.filter(({ fk_subject_id }, index) => !subjectsList.includes(fk_subject_id, index + 1));
    }
    if(this.subjectListDetails.length>0){
      this.ExistssubjectListDetails=this.subjectListDetails.filter(x=>(x.row_exists!=0))
      this.dataSource = new MatTableDataSource(this.ExistssubjectListDetails);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  onSubjectSelect(subject: any) {
if (subject) {
  this.selectedSubjects.push({
    univEcCollegeId: this.ExamCentersCollegesList.filter(x=>(x.fk_college_id==this.staffForm.value.univEcCollegeId))[0].fk_univ_ec_college_id,
    courseGroupId: this.staffForm.value.courseGroupId,
    courseYearId: this.staffForm.value.courseYearId,
    regulationId: this.staffForm.value.regulationId,
    subjectId: subject.fk_subject_id
  });
}
  }

  Assign() {
    if (this.selectedSubjects && this.selectedSubjects.length > 0) {
      let details = this.selectedSubjects
      this.spinner.show();
      /*---------- ADD EXAM CENTER COLLEGES ----------*/
      this.crudService.add(this.addUnivEcCollegeDetailsUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.snotifyService.success(result.message, 'Success!');
            // this.getExamColleges();
            this.selectedRegulation(this.staffForm.value.regulationId);
            // this.onCourseYearSelect (this.selectedSubjects[0]);
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
    } else {
      this.snotifyService.info('Please Select Subjects...!', 'Info!');
    }
  }
  getexamCenterColleges() {
    this.spinner.show();
    this.examCenterColleges = [];
    this.crudService.listDetailsByTwoIds(this.UnivEcCollegeDetailsUrl, this.univEcCollegeId,
      'true', 'univEcColleges.univEcCollegeId', this.isActive)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '') {
            this.examCenterColleges = result.data.resultList;
            this.dataSource = new MatTableDataSource(this.examCenterColleges);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
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
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
 editDialog(row){
    const dialogRef = this.dialog.open(ExamCenterCoursesModalComponent, {
      width: '500px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        this.updateDetails(details)
      }
    });
  }
  updateDetails(details) {
    this.spinner.show();
    this.crudService.update(this.updateInActiveUnivEcCollegeDetailsUrl, details)
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.selectedRegulation(this.staffForm.value.regulationId);
          } else {
            this.snotifyService.info(result.message, 'Info!');
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
}
