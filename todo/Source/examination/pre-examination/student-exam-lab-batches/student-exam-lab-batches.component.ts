
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { UpdateExamLabBatchesComponent } from './update-exam-lab-batches/update-exam-lab-batches.component';

@Component({
  selector: 'app-student-exam-lab-batches',
  templateUrl: './student-exam-lab-batches.component.html',
  styleUrls: ['./student-exam-lab-batches.component.scss']
})
export class StudentExamLabBatchesComponent implements OnInit {
  staffForm: FormGroup;
  step = 0;
  public searchText: string;
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private examLabBatchesCrudUrl = CONSTANTS.examLabBatchesCrudUrl;
  private addExamLabBatchesStudentsListUrl = CONSTANTS.addExamLabBatchesStudentsListUrl;
  private updateExamLabBatchesStudentsUrl=CONSTANTS.updateExamLabBatchesStudentsUrl;
  private getexamLabBatchesReportUrl = CONSTANTS.getexamLabBatchesReport;
  MINIO = CONSTANTS.MINIO
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private isActive = CONSTANTS.isActive;
  examFeeTypes=[];
  examTypes=[];
  colleges = [];
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
  BatchesData = [];
  batchStudents = [];
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
  examName: any;
  subjectCode: any;
  examStudentList=[];
  checkStudent:boolean;
  selectedCount: number;
  examStudentListdata=[];
  examStudentList1=[];
  batchStudentList=[];
  examStudentListData: any[];
  batchStudentListData: any[];
  flag=false;
  updaterequest: { examLabBatchStdId: any; examLabBatchesId: any; }[];
  examName1: string;
  subjectCode2: any;
  subjectName;
  orgCode;
  Logo;
  collegeName;
  studentBatchesData = [];
  stdBatchesData = [];
  courseGroup: any;
  isPrintMode: boolean = false;
  batchWiseStds = [];
  studentsDataBatch = [];
  batchesData = [];
  regulationList: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private dialog: MatDialog) {
      this.getExamTypes()
      this.getFiltersList();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        academicYearId: ['', Validators.required],
        courseId: ['', Validators.required],
        courseGroupId: ['', Validators.required],
        courseYearId: ['', Validators.required],
        groupSectionId: ['', Validators.required],
        subjectId: ['', Validators.required],
        regulationId: ['', Validators.required],
        examId:[],
        eaxmLabBatchId:[],
        examtypeCatdetId:[]
      }); 
      this.orgCode=localStorage.getItem('orgCode')
    this.defaultAcademicYear = localStorage.getItem('academicYearId');
  }
  getExamTypes(){
    this.examTypes=[]
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList !== '') {
                      this.examTypes=result.data.resultList
                       
  
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                }else {
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
              this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.staffForm.value.courseId)
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
      this.staffForm.get('academicYearId').setValue('')
      this.staffForm.get('examId').setValue('');
      this.staffForm.get('collegeId').setValue('');
      this.staffForm.get('courseGroupId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('regulationId').setValue('');
      this.staffForm.get('subjectId').setValue('');
      this.academicYears=[]
      this.academicYearsList=[]
      console.log(this.CollegesListFilterDetails , this.staffForm.value.courseId );
      
      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (this.academicYears.length > 0) {
        const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.staffForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        // this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
        this.data = this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
        this.selectedAcademicYear(this.staffForm.value.academicYearId)
      }

    }
  }

  selectedAcademicYear(academicYearId): void {
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (this.examsList.length > 0) {
        this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
        this.selectedExam(this.staffForm.value.examId);
      }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.examFeeTypes = [];
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.examTypes.length; i++){
      if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam){
        if (this.examTypes[i].generalDetailCode === 'Regular'){
          this.examFeeTypes.push(this.examTypes[i]);
       }
      }
      if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam){
        if (this.examTypes[i].generalDetailCode === 'Supple'){
          this.examFeeTypes.push(this.examTypes[i]);
       }
      }
      if(this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam){
        if (this.examTypes[i].generalDetailCode === 'Internal'){
          this.examFeeTypes.push(this.examTypes[i]);
       }
      }
    }
      this.staffForm.get('examtypeCatdetId').setValue(this.examFeeTypes[0]?.generalDetailId);
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
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
                console.log( this.filtersDetailsList[i]);
                
                this.regulationFilterList = this.filtersDetailsList[i];
              }

            }

            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
              this.colleges = []
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (this.colleges.length > 0) {
                this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                this.data = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0].college_code;
                this.selectedCollege(this.staffForm.value.collegeId);
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

    this.courseGroupList = []
    this.courseGroups = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []
    this.staffForm.get('courseGroupId').setValue('');
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    if (collegeId != null) {
    
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId ))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (this.courseGroups.length > 0) {
        this.staffForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
        this.selectedGroup(this.staffForm.value.courseGroupId)
      }
    }

    
  }



  selectedGroup(courseGroupId): void {
    this.staffForm.get('courseYearId').setValue('');
    this.staffForm.get('regulationId').setValue('');
    this.staffForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []

    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.staffForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
    //      if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
    //       this.staffForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
    //       this.selectedYear( this.staffForm.value.courseYearId);
    // } 
    //    else 
    if (this.courseYears.length > 0) {
      this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.staffForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId){
    this.staffForm.get('subjectId').setValue('');
    this.staffForm.get('regulationId').setValue('');
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
        this.staffForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
        this.selectedRegulation(this.staffForm.value.regulationId)
      }

    }
  }

  selectedRegulation(regulationId): void {
    this.staffForm.get('subjectId').setValue('');
      this.subjectsDetailList = []
      this.subjectData = []
      this.subjectsList =[]
      let request = [
        { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
        { paramName: 'in_flag_type', paramValue: 'ALL' },
        { paramName: 'in_university_id', paramValue: 0 },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
        { paramName: 'in_regulation_id', paramValue:  this.staffForm.value.regulationId },
        { paramName: 'in_subject_id', paramValue: 0 },
        { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
        { paramName: 'in_loginuser_roleid', paramValue: 0 },
        { paramName: 'in_sub_flag_type', paramValue: 'LAB' },
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
                //       this.staffForm.get('examId').setValue(+this.pageParams.examId);
                //       this.getHallTickets();
                // } 
                //    else 
                if (this.subjectsList.length > 0) {
                  // this.bulkHallticketDetails =[]
                  // this.bulkTable=false
                  this.staffForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
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
  selectedSubject(){
    this.flag=false;
  }
  getLabBatches(): void{
    this.examStudentListdata=[]
    this.studentBatches=[];
    this.BatchesData = [];
    this.batchStudents = []; 
    this.updaterequest=[]
    /*----------- TIMETABLES -----------*/
    this.crudService.listDetailsBySevenIds(this.examLabBatchesCrudUrl,
    this.staffForm.value.collegeId,  this.staffForm.value.examId , this.staffForm.value.courseYearId, this.staffForm.value.courseGroupId,this.staffForm.value.regulationId,
    this.staffForm.value.subjectId,this.staffForm.value.examtypeCatdetId,
    'college.collegeId', 'examMaster.examId','courseYear.courseYearId','courseGroup.courseGroupId', 'Regulation.regulationId', 'subject.subjectId','examtypeCatdet.generalDetailId')
             .subscribe(result => {
              if (result.statusCode === 200){
                      if (result.data.resultList && result.data.resultList !== '') {
                          this.studentBatches = result.data.resultList;
                          this.BatchesData = result.data.resultList;
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
    this.studentBatchesData = [];
    this.examStudentListData=[]
    this.studentList = []; 
    this.examStudentList=[]
    this.students =[];
      this.spinner.show();
      this.clgName = this.colleges.filter(x => x.fk_college_id === this.staffForm.value.collegeId)[0].college_code;
      this.collegeName = this.colleges.filter(x => x.fk_college_id === this.staffForm.value.collegeId)[0].college_name;
      this.Logo = this.colleges.filter(x=> (x.fk_college_id === this.staffForm.value.collegeId))[0].logo_filename;
      this.academic = this.academicYears.filter(x => x.fk_academic_year_id === this.staffForm.value.academicYearId)[0].academic_year;
      this.courseName = this.courses.filter(x => x.fk_course_id === this.staffForm.value.courseId)[0].course_code;
      this.courseGroupName = this.courseGroups.filter(x => x.fk_course_group_id === this.staffForm.value.courseGroupId)[0].group_code;
      this.courseGroup = this.courseGroups.filter(x => x.fk_course_group_id === this.staffForm.value.courseGroupId)[0].group_name;
      this.courseYearName = this.courseYears.filter(x => x.fk_course_year_id === this.staffForm.value.courseYearId)[0].course_year_code;
      this.examName = this.examsList.filter(x => x.fk_exam_id === this.staffForm.value.examId)[0].exam_name
      this.subjectName = this.subjectsList.filter(x => x.fk_subject_id === this.staffForm.value.subjectId)[0].subject_name
      this.subjectCode = this.subjectsList.filter(x => x.fk_subject_id === this.staffForm.value.subjectId)[0].subject_code
      this.flag = true
      this.studentBatchesData = [];
      this.stdBatchesData = [];
      this.batchesData = [];
      this.spinner.show()
      let request = [
        { paramName: 'in_flag', paramValue: '' },
        { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
        { paramName: 'in_college_id', paramValue: this.staffForm.value.collegeId },
        { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
        { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
        { paramName: 'in_course_group_id', paramValue: this.staffForm.value.courseGroupId },
        { paramName: 'in_course_year_id', paramValue: this.staffForm.value.courseYearId },
        { paramName: 'in_subject_id', paramValue: this.staffForm.value.subjectId },
        { paramName: 'in_exam_labbatch_id', paramValue: 0 },
        { paramName: 'in_exam_type', paramValue: this.staffForm.value.examtypeCatdetId},
    
      ];
      this.crudService.getDetailsByRequest(this.getexamLabBatchesReportUrl, '', request, '&')
        .subscribe(result => {
          if (result.statusCode === 200) {
            this.spinner.hide()
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              for (let index = 0; index < result.data.result[0].length; index++) {
                if(result.data.result[0][index].fk_exam_labbatch_id==null){
                  this.examStudentList.push(result.data.result[0][index])
                }
                else{
                  this.studentBatchesData.push(result.data.result[0][index])
                }
                
              }
              this.students=this.examStudentList
              this.batchesData = this.studentBatchesData;
                 if(this.batchesData && this.batchesData.length > 0){
                  const batches = this.batchesData.map(({ fk_exam_labbatch_id }) => fk_exam_labbatch_id);
                  this.batchesData = this.batchesData.filter(({ fk_exam_labbatch_id }, index) =>
                    !batches.includes(fk_exam_labbatch_id, index + 1));
                  this.batchesData = this.batchesData.sort((a,b)=>a.fk_exam_labbatch_id - b.fk_exam_labbatch_id);
    
                 }
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

  searchStudent(value) { 
    this.examStudentList=[]
    this.searchOmrNos(value);
     }
   searchOmrNos(value: string) { 
     let filter = value.toLowerCase();
     for ( let i = 0 ; i < this.students.length; i++ ) {
         let option = this.students[i];
         if (option.hallticket_number.toLowerCase().indexOf(filter) >= 0) {
             this. examStudentList.push( option );
         }
        else if (option.student_name.toLowerCase().indexOf(filter) >= 0) {
          this.examStudentList.push( option );
      }
      
     }
  }



  markItems(): void{
    this.selectedCount = 0;
    this.examStudentListdata = [];
      for(let i=0;i<this.examStudentList.length;i++){
        if (this.checkStudent){
          this.examStudentList[i].checked = true;
          this.examStudentList[i].isSelected = true;
          this.examStudentListdata.push(this.examStudentList[i]);
          this.selectedCount++;
        
        }else{
          this.examStudentList[i].checked = false;
          this.examStudentList[i].isSelected = false;
          this.checkStudent=false
          this.examStudentListdata=[]
          // this.examStudentList1=[]
        }
     }
    
    }
    checkedserialNo(check,item){
      this.studentList=[]
        this.studentList.push(item)
      for (let i = 0; i < this.studentList.length; i++){
        if(check==false){
          for (let j = 0; j < this.examStudentListdata.length; j++){
            if(this.studentList[i].rollNumber==this.examStudentListdata[j].rollNumber){
              this.examStudentListdata.splice(j, 1);
    
            }
           
          }

        }
        else{
        this.examStudentListdata.push(this.studentList[i]);
        }
    }
    
  }

    assignLabStudents(): void{
    this.batchStudents = []; 
    this.updaterequest=[]
        this.spinner.show();
        for (let j = 0; j < this.examStudentListdata.length; j++){
          this.batchStudents.push({
           examLabBatchesId: this.staffForm.value.eaxmLabBatchId,
            studentDetailId:this.examStudentListdata[j].fk_student_id,
            // isPresent:null,
            isActive:true,
            // reason: null,
        });
        }
        this.crudService.add(this.addExamLabBatchesStudentsListUrl, this.batchStudents)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.success === true){
                            this.snotifyService.success(result.message, 'Success!');
                            this.getLabBatches()

                            // this.selectedSection(this.staffForm.value.groupSectionId);
                    }else {
                        this.snotifyService.error(result.message, 'Error!');
                        this.getLabBatches()
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
  updateExamBatch(item){
    this.updaterequest=[]
    this.batchStudents = []; 
  const dialogRef = this.dialog.open(UpdateExamLabBatchesComponent, {
    width: '30%',
    data: {
      item: item,
      studentBatches:this.studentBatches
    }

});
dialogRef.afterClosed().subscribe(details => {
  if (details != null && details !== ''){ 
       this.updaterequest=[{
          examLabBatchStdId:item.fk_exam_std_det_id,
          examLabBatchesId:details
        }]
               this.updatebatch(this.updaterequest)
  }  

})
}
updatebatch(obj){
  this.crudService.update(this.updateExamLabBatchesStudentsUrl,this.updaterequest)
  .subscribe(result => {
      this.spinner.hide();
      if (result.success === true){
              this.snotifyService.success(result.message, 'Success!');
              this.getLabBatches();
              // this.selectedSection(this.staffForm.value.groupSectionId);
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


print(){
  this.isPrintMode = true;
  setTimeout(() => {
    window.print();
    this.isPrintMode = false;
  }, 1000);
}

tConvert(time): any{
  if (time !== null && time !== undefined){
     time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
     if (time.length > 1) { // If time format correct
       time = time.slice (1);  // Remove full string match value
       time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
       time[0] = +time[0] % 12 || 12; // Adjust hours
     }
     time = time[0] + time[1] + time[2] + ' ' + time[5];
     return time; 
  }
}
}



