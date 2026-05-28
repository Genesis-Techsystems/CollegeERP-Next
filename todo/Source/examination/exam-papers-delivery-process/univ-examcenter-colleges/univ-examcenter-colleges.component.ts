import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { EditUnivExamcenterCollegesComponent } from './edit-univ-examcenter-colleges/edit-univ-examcenter-colleges.component';

@Component({
  selector: 'app-univ-examcenter-colleges',
  templateUrl: './univ-examcenter-colleges.component.html',
  styleUrls: ['./univ-examcenter-colleges.component.scss']
})
export class UnivExamcenterCollegesComponent implements OnInit {

  private profileDetailUrl = CONSTANTS.profileDetailUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
  private isActive = CONSTANTS.isActive;
  private addListUnivEcCollegesUrl = CONSTANTS.addListUnivEcCollegesUrl;
  private UnivEcCollegesUrl = CONSTANTS.UnivEcCollegesUrl;
  private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;

  filtersDetailsList = [];
  CollegesListDetails = [];
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
  examGroups = [];
  staffForm: FormGroup;
  courseName: any;
  academicYearName: any;
  examsName: any;
  examCenterName: any;
  panelOpenState = true;
  step = 0;
  flag = false;

  displayedColumns: string[] = ['id', 'examcenter', 'exam', 'college', 'Actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    this.getFiltersList();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
       examGroupId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
    });
    this.dataSource = new MatTableDataSource(this.examCenterColleges);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'eg_filters' },   // or eg_ec_filters based on step
      { paramName: 'in_flag_type', paramValue: '' },

      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: 0 }, // will change dynamically
      { paramName: 'in_exam_id', paramValue: 0 },

      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },

      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },

      { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') }, // ⚠️ use correct university id

      { paramName: 'in_exam_date', paramValue: '1900-01-01' }, // REQUIRED
      { paramName: 'in_questionpaper_code', paramValue: '' }   // REQUIRED
    ];
    this.crudService.getDetailsByRequest(this.profileDetailUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'eg_ay_filter') {
                this.CollegesListDetails = this.filtersDetailsList[i];
                // ✅ Extract Academic Years
                    const academicYearIds = this.CollegesListDetails.map(x => x.fk_academic_year_id);

                    this.academicYears = this.CollegesListDetails.filter(
                      (x, index) => !academicYearIds.includes(x.fk_academic_year_id, index + 1)
                    );
              }
              
            }

            const examGroupIds = this.CollegesListDetails.map(x => x.fk_univ_exam_group_id);

                this.examGroups = this.CollegesListDetails.filter(
                  (x, index) => !examGroupIds.includes(x.fk_univ_exam_group_id, index + 1)
                );
                this.univExamCenters = this.filtersDetailsList[1];
            const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
           else {
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


  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.staffForm.get('examId').setValue(0);
    this.staffForm.get('academicYearId').setValue(0);
    this.academicYears = []
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.academicYearsList = [];
    this.examData = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));

    }
    if (this.academicYears.length > 0) {
      this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
      this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  selectedAcademicYear(academicYearId) {
    this.staffForm.get('examId').setValue(0);
    this.searchExams = [];
    this.examsList = [];
    this.searchExams = [];
    this.examsLists = [];
    this.examData = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.examsList[0].fk_exam_id)
    }
  }


  selectedExamGroup(examGroupId): void {
    this.spinner.show();

    let request = [
      { paramName: 'in_flag', paramValue: 'eg_ec_filters' },
      { paramName: 'in_flag_type', paramValue: '' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_exam_group_id', paramValue: examGroupId },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' }
    ];

    this.crudService.getDetailsByRequest(this.profileDetailUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();

        if (result.statusCode === 200) {
          console.log(result.data.result);
          this.univExamCenters = result.data.result[0];
        }
      });
  }
  searchExam(value) {
    this.examData = [];
    this.examSearch(value);
  }
  examSearch(value: string) {
    let filter = value.toLowerCase()
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }

  selectedExam(examId): void {
  this.spinner.show();
  this.examCenterColleges = [];
  this.flag = false;
  this.spinner.hide();
}
headerData() {
  this.examsName = this.examsList.filter(x => x.fk_exam_id == this.staffForm.value.examId)[0]?.exam_name;
  this.academicYearName = this.academicYears.filter(x => x.fk_academic_year_id == this.staffForm.value.academicYearId)[0]?.academic_year;
  this.courseName = this.courses.filter(x => x.fk_course_id == this.staffForm.value.courseId)[0]?.course_code;
  this.examCenterName = this.univExamCenters.filter(x => x.fk_univ_ec_id == this.staffForm.value.univExamcenterId)[0]?.ec_name;
}
  getExamColleges() {
    this.colleges = [];
    this.collegeLists = [];
    this.flag = false;
    this.collegeLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_exam_id == this.staffForm.value.examId))
    if (this.collegeLists.length > 0) {
      const collegeLists = this.collegeLists.map(({ fk_college_id }) => fk_college_id);
      this.colleges = this.collegeLists.filter(({ fk_college_id }, index) =>
        !collegeLists.includes(fk_college_id, index + 1));
    }
    if (this.colleges && this.colleges.length > 0) {
      if (this.examCenterColleges && this.examCenterColleges.length > 0) {
        this.colleges = this.colleges.filter(
          x => !this.examCenterColleges.some(y => y.collegeId === x.fk_college_id)
        );
      }
    }
    this.examColleges = this.colleges;
    this.flag = true;
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
        // this.colleges=[]
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
  Assign() {
    if (this.selectedColleges && this.selectedColleges.length > 0) {
      let details = [];
      this.spinner.show();
      for (let i = 0; i < this.selectedColleges.length; i++) {
        details.push({
          univExamCentersId: this.staffForm.value.univExamcenterId,
          examMasterId: this.staffForm.value.examId,
          collegeId: this.selectedColleges[i].fk_college_id,
          isActive: true,
          createdUser: +localStorage.getItem('employeeId')
        })
      }
      console.log(details, 'details');
      /*---------- ADD EXAM CENTER COLLEGES ----------*/
      this.crudService.add(this.addListUnivEcCollegesUrl, details)
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            this.snotifyService.success(result.message, 'Success!');
            this.getexamCenterColleges();
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
      this.snotifyService.info('Please Select College...!', 'Info!');
    }
  }
  getexamCenterColleges() {
    this.spinner.show();

    this.examCenterColleges = [];
    this.dataSource = new MatTableDataSource([]);

    let request = [
      { paramName: 'in_flag', paramValue: 'eg_clg_cou_exam_list' },
      { paramName: 'in_flag_type', paramValue: '' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_exam_group_id', paramValue: this.staffForm.value.examGroupId },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_university_id', paramValue: +localStorage.getItem('universityId') },
      { paramName: 'in_exam_date', paramValue: '1900-01-01' },
      { paramName: 'in_questionpaper_code', paramValue: '' }
    ];

    this.crudService.getDetailsByRequest(this.profileDetailUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();

        if (result.statusCode === 200) {
          if (result.data && result.data.result.length > 0) {
            this.examCenterColleges = result.data.result[0];
            this.dataSource = new MatTableDataSource(this.examCenterColleges);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.getExamColleges(); // optional
          }else {
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
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  editDialog(row) {
    const dialogRef = this.dialog.open(EditUnivExamcenterCollegesComponent, {
      width: '800px',
      data: row
    });
    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== '') {
        console.log(details, 'details');
        this.updateDetails(details)
      }
    });
  }
  updateDetails(details) {
    this.spinner.show();
    this.crudService.updateDetails(this.UnivEcCollegesUrl, details, details.univEcCollegeId, 'univEcCollegeId')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.success) {
            this.getexamCenterColleges();
            this.snotifyService.success(result.message, 'Success!');
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
