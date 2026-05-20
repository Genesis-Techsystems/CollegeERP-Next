import { Component, OnInit } from '@angular/core';
import { DndDropEvent } from 'ngx-drag-drop';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { Regulations } from 'app/main/models/Rregulations';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { AcademicYear } from 'app/main/models/academicYear';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { MatDialog } from '@angular/material/dialog';
import { Section } from 'app/main/models/section';

@Component({
  selector: 'app-exam-lab-batches-students',
  templateUrl: './exam-lab-batches-students.component.html',
  styleUrls: ['./exam-lab-batches-students.component.scss']
})
export class ExamLabBatchesStudentsComponent implements OnInit {
  sectionsForm: FormGroup;
  step = 0;
  public searchText: string;

  private studentListUrl = CONSTANTS.studentListUrl;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private examLabBatchesCrudUrl = CONSTANTS.examLabBatchesCrudUrl;
  private getExamLabBatchesStudentsUrl = CONSTANTS.getExamLabBatchesStudentsUrl;
  private addExamLabBatchesStudentsListUrl = CONSTANTS.addExamLabBatchesStudentsListUrl


  colleges: College[] = [];
  courses: Course[] = [];
  courseGroups: CourseGroup[] = [];
  regulations: Regulations[] = [];
  courseYears: CourseYear[] = [];
  academicYears: AcademicYear[] = [];
  sections: Section[] = [];
  subjects: any[] = [];
  students: any[] = [];
  studentList = [];
  subjectTypeId;
  subjectTypes: GeneralDetail[] = [];
  studentBatches: any[] = [];
  batchStudents = [];
  batchWiseStudents: any[] = [];
    public ExamMasterFilterCtrl: FormControl = new FormControl();
  

  public studentsLab1 = [];

  public studentsLab2 = [];

  public studentsLab3 = [];

  public studentsLab4 = [];
  clgName;
  academic;
  courseName;
  courseGroupName;
  courseYearName;
  sectionName;
  defaultAcademicYear: string;
  panelOpenState = true;
  timetables: any[] = [];
  filtersDetailsList: any[];
  CollegesListDetails: any[];
  CollegesListFilterDetails: any[];
  regulationFilterList: any[];
  groupDetails: any[];
  data: string;
  collegeCode: string;
  courseListData: any[];
  academicYearsList: any[];
  examsList: any[];
  courseGroupList: any[];
  courseYearsList: any;
  examsLists: any[];
  examData: any[];
  subjectsList: any[];
  subjectsDetailList: any;
  subjectData: any[];
  labBatches: any;
  examLabBatchStds: any;
  labBatchIds: any;
  examName: string;
  subjectCode: any;
  regulationList: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private dialog: MatDialog) {

      this.getFiltersList();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.sectionsForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        academicYearId: ['', Validators.required],
        courseId: ['', Validators.required],
        courseGroupId: ['', Validators.required],
        courseYearId: ['', Validators.required],
        groupSectionId: ['', Validators.required],
        subjectId: ['', Validators.required],
        examId:[]
      }); 
    this.defaultAcademicYear = localStorage.getItem('academicYearId');
  }

  getFiltersList(): void {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide(); 
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                this.CollegesListFilterDetails = this.filtersDetailsList[i];
              }
              

            }

            const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
              !Course_Id.includes(fk_course_id, index + 1));
            if (this.courses.length > 0) {
              this.sectionsForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.sectionsForm.value.courseId)
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

  selectedCourse(courseId): void {
    if (courseId != null) {
      this.sectionsForm.get('academicYearId').setValue('')
      this.sectionsForm.get('examId').setValue('');
      this.sectionsForm.get('collegeId').setValue('');
      this.sectionsForm.get('courseGroupId').setValue('');
      this.sectionsForm.get('courseYearId').setValue('');
      this.sectionsForm.get('regulationId').setValue('');
      this.sectionsForm.get('subjectId').setValue('');
      this.academicYears=[]
      this.academicYearsList=[]
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.sectionsForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        this.sectionsForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.sectionsForm.value.academicYearId))[0].academic_year;
        this.selectedAcademicYear(this.sectionsForm.value.academicYearId)
      }

    }
  }




  selectedAcademicYear(academicYearId): void {
    this.sectionsForm.get('examId').setValue('');
    this.sectionsForm.get('collegeId').setValue('');
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.sectionsForm.value.courseId && x.fk_academic_year_id == this.sectionsForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.sectionsForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.sectionsForm.value.examId);
      }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.sectionsForm.get('collegeId').setValue('');
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');

    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.sectionsForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.sectionsForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.sectionsForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide(); 
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationFilterList = this.filtersDetailsList[i];
              }

            }
            this.colleges = []
            this.courseGroups = []
            this.courseYears = []
            this.regulationList = []
            this.subjectData = []
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
           
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.sectionsForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.data = this.colleges.filter(x => (x.fk_college_id === this.sectionsForm.value.collegeId))[0].college_code;
                this.selectedCollege(this.sectionsForm.value.collegeId);
              }
              //     /*----------- COURSES Years -----------*/      
        
        
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
  selectedCollege(collegeId): void {

    this.courseGroups = []
    this.sectionsForm.get('courseGroupId').setValue('');
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
  
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.sectionsForm.value.collegeId ))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.sectionsForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.sectionsForm.value.courseGroupId)
      }
    }

    
  }



  selectedGroup(courseGroupId): void {
    this.sectionsForm.get('courseYearId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.sectionsForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []

    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.sectionsForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    //      if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
    //       this.sectionsForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
    //       this.selectedYear( this.sectionsForm.value.courseYearId);
    // } 
    //    else 
    if (this.courseYears.length > 0) {
      this.sectionsForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.sectionsForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId){
    this.sectionsForm.get('subjectId').setValue('');
    this.sectionsForm.get('regulationId').setValue('');
    this.regulationList = []
    this.subjectData = []
    if (courseYearId) {
      if (this.regulationFilterList.length > 0) {
        const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
        this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
      }
    
      if (this.regulationList.length > 0) {
        // this.bulkHallticketDetails =[]
        // this.bulkTable=false
        this.sectionsForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
        this.selectedRegulation(this.sectionsForm.value.regulationId)
      }

    }
  }

  selectedRegulation(regulationId): void {
    this.sectionsForm.get('subjectId').setValue('');
      this.subjectsDetailList = []
      this.subjectData = []
      this.subjectsList =[]
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.sectionsForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.sectionsForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.sectionsForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.sectionsForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.sectionsForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.sectionsForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue:  this.sectionsForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
        { paramName: 'in_param1', paramValue: 0 },
        { paramName: 'in_param2', paramValue: 0 },
      ];
      this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide(); 
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for (let i = 0; i < this.filtersDetailsList.length; i++) {
                if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
                  this.subjectsDetailList = this.filtersDetailsList[i];
                }
              }
              if (this.subjectsDetailList ) {
                if (this.subjectsDetailList.length > 0) {
                  const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
                  this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
                  this.subjectData = this.subjectsList;
                }
                //     if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
                //       this.sectionsForm.get('examId').setValue(+this.pageParams.examId);
                //       this.getHallTickets();
                // } 
                //    else 
                
                if (this.subjectsList.length > 0) {
                  // this.bulkHallticketDetails =[]
                  // this.bulkTable=false
                  this.sectionsForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
                }
          
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


  searchexam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }

  searchSubject(value) {
    this.subjectData = [];
    this.searchsubject(value)
  }

  searchsubject(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectsDetailList.length; i++) {
      let option = this.subjectsDetailList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectData.push(option);
      } else
        if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
          this.subjectData.push(option);
        }
    }
  }
  getLabBatches(): void{
    /*----------- TIMETABLES -----------*/
    this.crudService.listDetailsByThreeIds(this.examLabBatchesCrudUrl,
     this.sectionsForm.value.collegeId,  this.sectionsForm.value.examId ,  this.sectionsForm.value.subjectId, 
     'college.collegeId', 'examMaster.examId', 'subject.subjectId')
             .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.studentBatches = result.data.resultList;
                          this.getDetails();
                            this.labBatchIds =  this.studentBatches.map(item => item.eaxmLabBatchId).join(',');
                          
                      } else {
                          this.snotifyService.success(result.message, 'Success!');
                      }
                  }else{
                          this.snotifyService.error(result.message, 'Error!');
                  } 
             
          }, error => {
             if (error.error.statusCode === 401){
                 this.snotifyService.error(error.error.message, 'Error!');
                 this.genericFunctions.logOut(this.router.url);
             }else{
                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
             }
     });
}



  getDetails(): void{
    if (this.sectionsForm.value.collegeId != null){
      this.studentsLab1 = []; 
      this.studentsLab2 = []; 
      this.studentsLab3 = []; 
      this.studentsLab4 = [];
      this.studentList = []; 
      this.spinner.show();
      this.clgName = this.colleges.filter(x => x.fk_college_id === this.sectionsForm.value.collegeId)[0].college_code;
      this.academic = this.academicYears.filter(x => x.fk_academic_year_id === this.sectionsForm.value.academicYearId)[0].academic_year;
      this.courseName = this.courses.filter(x => x.fk_course_id === this.sectionsForm.value.courseId)[0].course_code;
      this.courseGroupName = this.courseGroups.filter(x => x.fk_course_group_id === this.sectionsForm.value.courseGroupId)[0].group_code;
      this.courseYearName = this.courseYears.filter(x => x.fk_course_year_id === this.sectionsForm.value.courseYearId)[0].course_year_name
      this.examName = this.examsList.filter(x => x.fk_exam_id === this.sectionsForm.value.examId)[0].exam_name
      this.subjectCode = this.subjectsList.filter(x => x.fk_subject_id === this.sectionsForm.value.subjectId)[0].subject_code

      /*----------------- STUDENTS ----------------*/
      this.crudService.listByFourIds(this.studentListUrl, this.sectionsForm.value.collegeId, this.sectionsForm.value.courseGroupId, this.sectionsForm.value.courseYearId, 'INCOLLEGE',
        'collegeId', 'courseGroupId', 'courseYearId', 'statusCode')
      .subscribe(result => {
          // this.getTimetable();
          this.spinner.hide();
          if (result.statusCode === 200) {
              if (result.data && result.data !== '') {
                  this.students = result.data;
                  // tslint:disable-next-line:max-line-length

                  this.crudService.listByIds(this.getExamLabBatchesStudentsUrl, this.labBatchIds,'examLabBatchId')
                  .subscribe(result1 => {
                      if (result1.statusCode === 200) {
                          if (result1.data && result1.data !== '') {
                              this.batchWiseStudents = result1.data;
                              // tslint:disable-next-line: prefer-for-of
                              for (let i = 0; i < this.students.length; i++){
                                  if (this.students[i].genderDisplayName === 'Male'){
                                    this.students[i].genderDisplayName = 'M';
                                  }else if (this.students[i].genderDisplayName === 'Female'){
                                    this.students[i].genderDisplayName = 'F';
                                  }
                                  // tslint:disable-next-line: prefer-for-of
                                  for (let j = 0; j < this.batchWiseStudents.length; j++){
                                      if (this.students[i].studentId === this.batchWiseStudents[j].studentDetailId){
                                           if (this.studentBatches.length > 0 && this.batchWiseStudents[j].examLabBatchesId === this.studentBatches[0].eaxmLabBatchId){
                                              // tslint:disable-next-line:max-line-length
                                              this.studentsLab1.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                           }else if (this.studentBatches.length > 1 && this.batchWiseStudents[j].examLabBatchesId === this.studentBatches[1].eaxmLabBatchId){
                                              // tslint:disable-next-line:max-line-length
                                              this.studentsLab2.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                           }else if (this.studentBatches.length > 2 && this.batchWiseStudents[j].examLabBatchesId === this.studentBatches[2].eaxmLabBatchId){
                                              // tslint:disable-next-line:max-line-length
                                              this.studentsLab3.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                           }else if (this.studentBatches.length > 3 && this.batchWiseStudents[j].examLabBatchesId === this.studentBatches[3].eaxmLabBatchId){
                                            // tslint:disable-next-line:max-line-length
                                            this.studentsLab4.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                           }
                                           break;
                                      }
                                  }
                              }
                              // tslint:disable-next-line: prefer-for-of
                              for (let i = 0; i < this.students.length; i++){
                                if (this.students[i].genderDisplayName === 'Male'){
                                    this.students[i].genderDisplayName = 'M';
                                  }else if (this.students[i].genderDisplayName === 'Female'){
                                    this.students[i].genderDisplayName = 'F';
                                  }
                                // tslint:disable-next-line:max-line-length
                                if (this.studentsLab1.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0 && 
                                        // tslint:disable-next-line:max-line-length
                                        this.studentsLab2.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0 && 
                                        // tslint:disable-next-line:max-line-length
                                        this.studentsLab3.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0 && 
                                        this.studentsLab4.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0){
                                            // tslint:disable-next-line:max-line-length
                                            if (this.studentList.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0){
                                                // tslint:disable-next-line:max-line-length
                                                this.studentList.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                            }  
                                }
                            }
                          } else {
                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.students.length; i++){
                                if (this.students[i].genderDisplayName === 'Male'){
                                    this.students[i].genderDisplayName = 'M';
                                  }else if (this.students[i].genderDisplayName === 'Female'){
                                    this.students[i].genderDisplayName = 'F';
                                  }
                                            // tslint:disable-next-line:max-line-length
                                if (this.studentList.filter(x => x.split('(')[1].substring(0, x.split('(')[1].length - 3) === this.students[i].rollNumber).length === 0){
                                    this.studentList.push(this.students[i].firstName + '(' + this.students[i].rollNumber + ')' + ':' + this.students[i].genderDisplayName);
                                }  
                            }
                             // this.snotifyService.success(result1.message, 'Success!');
                          }
                      } else {
                          this.snotifyService.error(result1.message, 'Error!');
                      }
                  }, error => {
                    if (error.error.statusCode === 401){
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    }else{
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                  });
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
              this.snotifyService.error(result.message, 'Error!');
          }
      }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401){
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
        }else{
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });  
    }
  }

  onDragged( item: any, list: any[] ): void {
    const index = list.indexOf( item );
    list.splice( index, 1 );
  }

  onDrop( event: DndDropEvent, list: any[] ): void {

    let index = event.index;

    if (typeof index === 'undefined' ) {
      index = list.length;
    }

    this.searchText = '';

    list.splice( index, 0, event.data );
  }

  assignStudents(): void{
    this.batchStudents = []; 
        this.spinner.show();
        // tslint:disable-next-line: prefer-for-of
        for ( let i = 0; i < this.studentsLab1.length; i++){
         // tslint:disable-next-line: prefer-for-of
         for (let j = 0; j < this.students.length; j++){
            if (this.studentsLab1[i].split('(')[1].substring(0, this.studentsLab1[i].split('(')[1].length - 3) === this.students[j].rollNumber){
                this.students[j].examLabBatchesId = this.studentBatches[0].eaxmLabBatchId;
                this.students[j].studentDetailId = this.students[j].studentId
                // this.students[j].academicYearId = this.sectionsForm.value.academicYearId;
                // this.students[j].collegeId = this.sectionsForm.value.collegeId;
                // this.students[j].courseYearId = this.sectionsForm.value.courseYearId;
                if (this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId).length > 0){
                    this.students[j].examLabBatchesId = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].examLabBatchesId;
                    this.students[j].studentDetailId = this.students[j].studentId
                    this.students[j].createdDt = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdDt;
                    this.students[j].createdUser = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdUser;
                }
                this.batchStudents.push(this.students[j]);
                break;
            }
         }
    }
    

        // tslint:disable-next-line: prefer-for-of
        for ( let i = 0; i < this.studentsLab2.length; i++){
        // tslint:disable-next-line: prefer-for-of
        for (let j = 0; j < this.students.length; j++){
           if (this.studentsLab2[i].split('(')[1].substring(0, this.studentsLab2[i].split('(')[1].length - 3) === this.students[j].rollNumber){
               this.students[j].examLabBatchesId = this.studentBatches[1].eaxmLabBatchId;
               this.students[j].studentDetailId = this.students[j].studentId
               this.students[j].academicYearId = this.sectionsForm.value.academicYearId;
               this.students[j].collegeId = this.sectionsForm.value.collegeId;
               this.students[j].courseYearId = this.sectionsForm.value.courseYearId;
               if (this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId).length > 0){
                    this.students[j].examLabBatchesId = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].examLabBatchesId;
                    this.students[j].studentDetailId = this.students[j].studentId
                    this.students[j].createdDt = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdDt;
                    this.students[j].createdUser = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdUser;
                }
               this.batchStudents.push(this.students[j]);
               break;
           }
        }
    }

        // tslint:disable-next-line: prefer-for-of
        for ( let i = 0; i < this.studentsLab3.length; i++){
        // tslint:disable-next-line: prefer-for-of
        for (let j = 0; j < this.students.length; j++){
           if (this.studentsLab3[i].split('(')[1].substring(0, this.studentsLab3[i].split('(')[1].length - 3) === this.students[j].rollNumber){
               this.students[j].examLabBatchesId = this.studentBatches[2].eaxmLabBatchId;
               this.students[j].studentDetailId = this.students[j].studentId
               this.students[j].academicYearId = this.sectionsForm.value.academicYearId;
               this.students[j].collegeId = this.sectionsForm.value.collegeId;
               this.students[j].courseYearId = this.sectionsForm.value.courseYearId;
               if (this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId).length > 0){
                    this.students[j].examLabBatchesId = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].examLabBatchesId;
                    this.students[j].studentDetailId = this.students[j].studentId
                    this.students[j].createdDt = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdDt;
                    this.students[j].createdUser = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdUser;
                }
               this.batchStudents.push(this.students[j]);
               break;
           }
        }
    }

        // tslint:disable-next-line: prefer-for-of
        for ( let i = 0; i < this.studentsLab4.length; i++){
        // tslint:disable-next-line: prefer-for-of
        for (let j = 0; j < this.students.length; j++){
           if (this.studentsLab4[i].split('(')[1].substring(0, this.studentsLab4[i].split('(')[1].length - 3) === this.students[j].rollNumber){
               this.students[j].examLabBatchesId = this.studentBatches[3].eaxmLabBatchId;
               this.students[j].studentDetailId = this.students[j].studentId
               this.students[j].academicYearId = this.sectionsForm.value.academicYearId;
               this.students[j].collegeId = this.sectionsForm.value.collegeId;
               this.students[j].courseYearId = this.sectionsForm.value.courseYearId;
               if (this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId).length > 0){
                    this.students[j].examLabBatchesId = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].examLabBatchesId;
                    this.students[j].studentDetailId = this.students[j].studentId
                    this.students[j].createdDt = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdDt;
                    this.students[j].createdUser = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdUser;
                }
               this.batchStudents.push(this.students[j]);
               break;
           }
        }
    }

        // tslint:disable-next-line: prefer-for-of
        for ( let i = 0; i < this.studentList.length; i++){
        // tslint:disable-next-line: prefer-for-of
        for (let j = 0; j < this.students.length; j++){
           if (this.studentList[i].split('(')[1].substring(0, this.studentList[i].split('(')[1].length - 3) === this.students[j].rollNumber){
               this.students[j].examLabBatchesId = null;
               this.students[j].academicYearId = this.sectionsForm.value.academicYearId;
               this.students[j].collegeId = this.sectionsForm.value.collegeId;
               this.students[j].courseYearId = this.sectionsForm.value.courseYearId;
               if (this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId).length > 0){
                   this.students[j].examLabBatchesId = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].examLabBatchesId;
                   this.students[j].studentDetailId = this.students[j].studentId
                   this.students[j].createdDt = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdDt;
                   this.students[j].createdUser = this.batchWiseStudents.filter(x => x.studentId === this.students[j].studentId)[0].createdUser;
                   this.students[j].isActive = false;
                   this.batchStudents.push(this.students[j]);
                   
               }
               break;
           }
        }
   }
        this.crudService.add(this.addExamLabBatchesStudentsListUrl, this.batchStudents)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.success === true){
                            this.snotifyService.success(result.message, 'Success!');
                            // this.selectedSection(this.sectionsForm.value.groupSectionId);
                    }else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401){
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                   }else{
                       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                   }
                });
   

  }  

}
