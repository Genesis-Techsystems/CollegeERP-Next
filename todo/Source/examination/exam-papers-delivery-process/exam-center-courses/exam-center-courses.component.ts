
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

  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private UnivEcCollegeDetailsUrl = CONSTANTS.UnivEcCollegeDetailsUrl;
  private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
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
  examCenterName: any;
  examCollegeName:any;
  regulationCode:any;
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
  univEcCollegeId: any
  examsCentersList = [];
  ExamCentersCollegesList = [];

  // Simulated data for course years based on selected group
  courseYearsData = {
    28: [{ fk_course_year_id: 43, course_year_code: 'VSEM' }, { fk_course_year_id: 44, course_year_code: 'VISEM' }],
    29: [{ fk_course_year_id: 45, course_year_code: 'ISEM' }, { fk_course_year_id: 46, course_year_code: 'IISEM' }]
  };

  // Simulated data for subjects based on selected course year
  subjectsData = {
    43: [{ subject_id: 101, subject_name: 'Math' }, { subject_id: 102, subject_name: 'Science' }],
    44: [{ subject_id: 103, subject_name: 'History' }, { subject_id: 104, subject_name: 'Geography' }],
    45: [{ subject_id: 105, subject_name: 'Physics' }, { subject_id: 106, subject_name: 'Chemistry' }]
  };

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

  constructor(private snotifyService: SnotifyService, private genericFunctions: GenericFunctions, private dialog: MatDialog,
    private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private formBuilder: FormBuilder,) {

    this.getFiltersList();
  }

  ngOnInit(): void {
    this.staffForm = this.formBuilder.group({
      univEcCollegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],
      univExamcenterId: ['', Validators.required],
      regulationId: ['', Validators.required],
      courseGroupId: new FormControl(null, Validators.required),
      courseYearId: new FormControl(null, Validators.required)

    });

    this.dataSource = new MatTableDataSource(this.examCenterColleges);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getFiltersList(): void {
    this.spinner.show();

    let request = [
      { paramName: 'in_flag', paramValue: 'exam_center_clg_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'exam_center_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              } else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationDetailsList = this.filtersDetailsList[i];
              }
            }


            const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
          }
          if (this.courses.length > 0) {
            this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
            this.selectedCourse(this.staffForm.value.courseId);
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


  // tslint:disable-next-line:typedef
  selectedCourse(courseId) {
    this.regulations = this.regulationDetailsList.filter(x=>x.fk_course_id == this.staffForm.value.courseId )
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
    this.univExamCenters = [];
    this.examCenterColleges = [];
    this.flag = false;
    this.univExamCenters = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId && x.fk_exam_id == this.staffForm.value.examId))
    if (this.univExamCenters.length > 0) {
      const examCenters = this.univExamCenters.map(({ fk_univ_examcenter_id }) => fk_univ_examcenter_id);
      this.examsCentersList = this.univExamCenters.filter(({ fk_univ_examcenter_id }, index) => !examCenters.includes(fk_univ_examcenter_id, index + 1));
    }
    if (this.examsCentersList.length > 0) {
      this.staffForm.get('univExamcenterId').setValue(this.examsCentersList[0].fk_univ_examcenter_id);
      this.selectedExamCenter(this.staffForm.value.univExamcenterId)
      this.headerData();
    }

  }
  selectedExamCenter(univExamcenterId) {
    this.ExamCentersColleges = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId && x.fk_exam_id == this.staffForm.value.examId && x.fk_univ_examcenter_id == this.staffForm.value.univExamcenterId))
    const collegeLists = this.ExamCentersColleges.map(({ fk_college_id }) => fk_college_id);
    this.ExamCentersCollegesList = this.ExamCentersColleges.filter(({ fk_college_id }, index) =>
      !collegeLists.includes(fk_college_id, index + 1));
    if (this.ExamCentersCollegesList.length > 0) {
      this.staffForm.get('univEcCollegeId').setValue(this.ExamCentersCollegesList[0].fk_college_id);
      this.selectedExamCentersColleges(this.staffForm.value.univEcCollegeId);
    }



  }
  selectedExamCentersColleges(univEcCollegeId) {
    if (this.regulations.length > 0) {
      // this.ExamCentersColleges = this.ExamCentersColleges[0]
      this.staffForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      // this.selectedRegulation(this.staffForm.value.regulationId);
    }

  }
  selectedRegulation(regulationId) {
  this.ExistssubjectListDetails=[]
    this.courseGroupSubjectsDetails=[]
    this.courseYears = []
    this.subjectListDetails = []
    this.courseGroups = []
    let request = [
      { paramName: 'in_flag', paramValue: 'ec_grp_yr_subjects' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_univ_examcenter_id', paramValue: this.staffForm.value.univExamcenterId },
      { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
      { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: this.staffForm.value.regulationId },


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
          }
          // this.courseGroupsList = this.courseGroupSubjectsDetails.filter(x => (x.fk_college_id == this.staffForm.value.univEcCollegeId))

          if (this.courseGroupSubjectsDetails.length > 0) {
            const courseGroupsList = this.courseGroupSubjectsDetails.map(({ fk_course_group_id }) => fk_course_group_id);
            this.courseGroups = this.courseGroupSubjectsDetails.filter(({ fk_course_group_id }, index) => !courseGroupsList.includes(fk_course_group_id, index + 1));

          }
          if (this.courseGroups.length > 0) {
            // this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
            this.examColleges = this.courseGroups;

          }
          this.colleges = [];
          this.collegeLists = [];
          this.examCenterColleges = [];
          this.flag = false;
          // this.getexamCenterColleges();
          this.collegeLists = this.courseGroupSubjectsDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_exam_id == this.staffForm.value.examId))
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
    this.examsName = this.examsList.filter(x => (x.fk_exam_id == this.staffForm.value.examId))[0]?.exam_name
    this.academicYearName = this.academicYears.filter(x => (x.fk_academic_year_id == this.staffForm.value.academicYearId))[0]?.academic_year
    this.courseName = this.courses.filter(x => (x.fk_course_id == this.staffForm.value.courseId))[0]?.course_code
    this.examCenterName = this.univExamCenters.filter(x => (x.fk_univ_examcenter_id == this.staffForm.value.univExamcenterId))[0]?.examcenter_code
    this.examCollegeName =this.ExamCentersCollegesList.filter(x => (x.fk_college_id == this.staffForm.value.univEcCollegeId))[0]?.college_code
    this.regulationCode =this.regulations.filter(x => (x.fk_regulation_id == this.staffForm.value.regulationId))[0]?.regulation_code

  }
  getExamColleges() {
    this.colleges = [];
    this.collegeLists = [];
    this.examCenterColleges = [];
    this.flag = false;
    // this.getexamCenterColleges();
    this.collegeLists = this.courseGroupSubjectsDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_exam_id == this.staffForm.value.examId))
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
      // this.staffForm.get('courseYearId').setValue(this.courseYearList[0].fk_course_year_id);
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
    
    // let request = [
    //   { paramName: 'in_flag', paramValue: 'reg_subjects' },
    //   { paramName: 'in_univ_examcenter_id', paramValue: 0 },
    //   { paramName: 'in_college_id', paramValue: this.staffForm.value.univEcCollegeId },
    //   { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
    //   { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
    //   { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
    //   { paramName: 'in_exam_id', paramValue: 0 },
    //   { paramName: 'in_academic_year_id', paramValue: 0 },
    //   { paramName: 'in_regulation_id', paramValue: 0 },
    // ];
    // this.crudService.getDetailsByRequest(this.getCollegeExamCenters, '', request, '&')
    //   .subscribe(result => {
    //     this.spinner.hide();
    //     if (result.statusCode === 200) {
    //       this.subjectListDetails = result.data.result[0];
    //       this.snotifyService.success(result.message, 'Success!');
    //     }
    //     else {
    //       this.snotifyService.error(result.message, 'Error!');
    //     }
    //   }, error => {
    //     this.spinner.hide();
    //     if (error.error.statusCode === 401) {
    //       this.snotifyService.error(error.error.message, 'Error!');
    //       this.genericFunctions.logOut(this.router.url);
    //     } else {
    //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //     }
    //   });


  }



  onSubjectSelect(subject: any) {
if (subject) {
  this.selectedSubjects.push({
    univEcCollegeId: this.ExamCentersCollegesList.filter(x=>(x.fk_college_id==this.staffForm.value.univEcCollegeId))[0].fk_univ_ec_college_id,
    // courseId: this.staffForm.value.courseId,    
    courseGroupId: this.staffForm.value.courseGroupId,
    courseYearId: this.staffForm.value.courseYearId,
    subjectId: subject.fk_subject_id
  });
}
    // if (subject.checked) {
    //   // Add subject only if it's not already present
    //   const exists = this.subjectListDetails.some(s => s.fk_subject_id === subject.fk_subject_id);
    //   console.log(exists);
      
  
    // } 
    // else {
    //   // Remove unchecked subject
    //   this.selectedSubjects = this.selectedSubjects.filter(s => s.subjectId !== subject.fk_subject_id);
    // }
  }


  updateSubjects() {
    this.subjects = [];
    this.selectedCourseYears.forEach(year => {
      const subjectsForYear = this.subjectsData[year.fk_course_year_id] || [];
      this.subjects = [...this.subjects, ...subjectsForYear];
    });
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
                                     
           setTimeout(() => {
            this.onCourseGroupSelect(this.selectedSubjects[0]);
            this.selectedSubjects=[]
            
           }, 500);
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
