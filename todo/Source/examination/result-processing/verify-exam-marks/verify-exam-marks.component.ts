import { Component, OnInit, VERSION, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ApplicationForm } from 'app/main/models/applicationForm';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import *  as moment from 'moment';
import {DataSource} from '@angular/cdk/collections';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatRadioChange } from '@angular/material/radio';
import { Moment } from 'moment';
import { MatDatepicker } from '@angular/material/datepicker';
import { Location } from '@angular/common';
@Component({
  selector: 'app-verify-exam-marks',
  templateUrl: './verify-exam-marks.component.html',
  styleUrls: ['./verify-exam-marks.component.scss']
})
export class VerifyExamMarksComponent implements OnInit {
  feeFormGroup: FormGroup;
  displayedValues: string[] = [];
  columns = [];
  // IntdisplayedColumns: string[] =  ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Int_is_present','Int_mark_entered','final_int_marks_entered'];
  // final_int_marks_entered
  IntdisplayedColumns: string[]=[]
  displayedColumns: string[] =  ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','ext_is_present','ext_marks_entered'];

  EvalautiondisplayedColumns: string[] =  ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','ext_is_present','1_evaluation_assigned','1_evaluation_evaluated','2_evaluation_assigned','2_evaluation_evaluated','3_evaluation_assigned','3_evaluation_evaluated'];

  // displayedColumns: string[] =  ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','ext_is_present','ext_marks_entered', ];
  dataSource: MatTableDataSource<ApplicationForm>;
  // displayedColumns: string[] =[]
  AlldisplayedColumns:string[]=[]
  // AlldisplayedColumns:string[]=['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','Int_is_present','Int_mark_entered','final_int_marks_entered','ext_is_present','1_evaluation_assigned','1_evaluation_evaluated','2_evaluation_assigned','2_evaluation_evaluated','3_evaluation_assigned','3_evaluation_evaluated','ext_marks_entered'];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  private endURL = CONSTANTS.MAINAPI;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive = CONSTANTS.isActive;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private ExamPreModerationUrl = CONSTANTS.ExamPreModerationUrl;
  MINIO = CONSTANTS.MINIO;

  @ViewChild('excelTable', { static: false }) excelTable: ElementRef;
  trafoexternalItem="External Marks Status Report";
  trafointernalItem="Internal Marks Status Report";
  trafoItem='External Evaluation Status Report';
  alltrafoItem='Exam Marks Status Report';
  collegeId = localStorage.getItem('collegeId');
  dashboard : any
  filtersDetailsList=[];
  marksListDetails=[];
  gradesDetailsList=[];
  CollegesListDetails=[];
  colleges=[];
  examsList=[];
  searchExams=[];
  filteredExams :any ;
  examData=[];
  examsLists=[];
  fromDate: string;
  toDate: string;
  panelOpenState = true;
  step = 0;  
  collegeCode: any;
  exam: any;
  collegeName: any;
  groupList: any[];
  courseGroups: any[];
  examTimetableSubjectsList: any[];
  examTimetableSubjects: any[];
  collegeLogo = [];
  orgCode = '';
  Logo:any;
  check=1;
  studentsList=[]
  groupCode='';
  subjectcode='';
  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,private location:Location) {
                this.orgCode = localStorage.getItem('orgCode');
                // this.fyear = this.fmdate.value.year();
                // this.fmonth = this.fmdate.value.month() + 1;
                // this.tyear = this.tmdate.value.year();
                // this.tmonth = this.tmdate.value.month() + 1;
  }

   ngOnInit() {
    this.feeFormGroup = this.formBuilder.group({
      collegeId: ['', Validators.required],
      employeeId: [0],
      academicYearId: [],
      courseId: [],
      courseYearId: [],
      courseGroupId: [],
      examId: ['', Validators.required],
      subjectId:[0],
      fdate: [new Date()]
    });
   

    // this.getColleges();
    // this.getGeneralDetails();
    this.getFiltersList();
  }

    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }
    reset(): void{
      this.feeFormGroup.get('collegeId').setValue('');
      this.feeFormGroup.get('examId').setValue('');
      this.feeFormGroup.get('courseGroupId').setValue(0);
      this.feeFormGroup.get('subjectId').setValue(0);
      this.gradesDetailsList = [];
    }
    getFiltersList(): void {
      this.filtersDetailsList=[]
      this.CollegesListDetails=[]
      this.colleges=[]
      this.spinner.show();
      let request = [
        {paramName: 'in_flag', paramValue: 'clg_exam_timetable_filters'},
        {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_college_id', paramValue: 0},
        {paramName: 'in_course_id', paramValue: 0},
        {paramName: 'in_course_group_id', paramValue: 0},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_group_section_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        {paramName: 'in_dept_id', paramValue: 0},
         {paramName: 'in_isadmin', paramValue: 0},
          {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
           {paramName: 'in_loginuser_roleid', paramValue: 0},
           {paramName: 'in_employee', paramValue: ''},
           {paramName: 'in_subject', paramValue: ''},
           {paramName: 'in_gm_codes', paramValue:''},
          
           
      ];
      this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.filtersDetailsList = result.data.result;
                for(let i=0; i<this.filtersDetailsList.length; i++){
                  if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_timetable_filters'){
                    this.CollegesListDetails  = this.filtersDetailsList[i];
                    }
            }
            const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
            !CollegeIdData.includes(fk_college_id, index + 1));
            if (this.colleges.length > 0){
              this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
              this.feeFormGroup.get('collegeId').setValue(this.colleges[0].fk_college_id);
              this.collegeCode =this.colleges.filter(x=>x.fk_college_id==this.feeFormGroup.value.collegeId)[0].college_code
             
  
              this.selectedCollege(this.feeFormGroup.value.collegeId); 
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
    selectedCollege(collegeId): void{
      this.feeFormGroup.get('examId').setValue('');
      this.feeFormGroup.get('courseGroupId').setValue(0);
      this.feeFormGroup.get('subjectId').setValue(0);
      this.examsList = [];
      this.searchExams = [];
      this.examData = [];
      this.examsList = [];
     
      this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id == this.feeFormGroup.value.collegeId))
    if(this.examsLists.length>0){
    const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
    this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
    this.examsList  = this.examsList.filter(x=>!x.is_internal_exam)
    this.examData = this.examsList;
    }
    // if (this.check==1) {
    //   this.examsList  = this.examsList.filter(x=>x.is_internal_exam)
    //   this.examData = this.examsList;
    // }
    // else{
    //   this.examsList  = this.examsList.filter(x=>!x.is_internal_exam)
    //   this.examData = this.examsList;
    // }
    if(this.examsList.length>0){
      this.feeFormGroup.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.feeFormGroup.value.examId);
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
  
  selectedExam(examId){
    this.feeFormGroup.get('courseGroupId').setValue(0);
    this.feeFormGroup.get('subjectId').setValue(0);
    this.examTimetableSubjectsList=[];
    this.examTimetableSubjects=[];
    this.collegeName =this.colleges.filter(x=>x.fk_college_id==this.feeFormGroup.value.collegeId)[0].college_name 
    this.exam = this.examsList.filter(x=>(x.fk_exam_id == this.feeFormGroup.value.examId))[0].exam_name;
    this.groupList=[]
    this.courseGroups =[]
    this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_exam_id==this.feeFormGroup.value.examId))
    if(this.examTimetableSubjects.length>0){
    const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
    this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
    }
    this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_exam_id==this.feeFormGroup.value.examId))
       if(this.groupList.length>0){
       const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
       this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
       }
    //    if (this.courseGroups.length > 0){
    //     this.feeFormGroup.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
    //      this.selectedCourseGroup(this.feeFormGroup.value.courseGroupId); 
    //  }
  }
  selectedCourseGroup(courseGroupId){
    this.feeFormGroup.get('subjectId').setValue(0);
    this.examTimetableSubjectsList=[]
    this.examTimetableSubjects=[]
    if(this.feeFormGroup.value.courseGroupId!=0){
      this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_exam_id==this.feeFormGroup.value.examId  && x.fk_course_group_id==this.feeFormGroup.value.courseGroupId))
    }
    else{
      this.examTimetableSubjects=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_exam_id==this.feeFormGroup.value.examId))
    }
    if(this.examTimetableSubjects.length>0){
    const examTimetableSubjects = this.examTimetableSubjects.map(({ fk_subject_id }) => fk_subject_id);
    this.examTimetableSubjectsList = this.examTimetableSubjects.filter(({ fk_subject_id }, index) => !examTimetableSubjects.includes(fk_subject_id, index + 1));
    }
  }
 
  getColleges(): void{
    this.collegeLogo =[];
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', 'isActive')
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.collegeLogo = result.data.resultList;  
                         this.Logo = this.collegeLogo.filter(x=> (x.collegeId == this.feeFormGroup.value.collegeId))[0].logo
                         this.collegeName = this.collegeLogo.filter(x=> (x.collegeId == this.feeFormGroup.value.collegeId))[0].collegeName
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
    getGradeList(): void {
      let request = []
      this.gradesDetailsList=[];
      if(this.feeFormGroup.valid){
      this.spinner.show();
      this.getColleges();
      if(this.feeFormGroup.value.courseGroupId!=0){
        this.groupCode=this.courseGroups.filter(x=>(x.fk_course_group_id==this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else{
        this.groupCode=''
      }
      if(this.feeFormGroup.value.subjectId!=0){
        this.subjectcode=this.examTimetableSubjectsList.filter(x=>(x.fk_subject_id==this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else{
        this.subjectcode=''
      }
      // if(this.examsList.filter(x=>x.fk_exam_id==this.feeFormGroup.value.examId)[0].is_internal_exam){
      //   this.displayedColumns= ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','Int_is_present','Int_mark_entered'];
      //   request = [
      //     {paramName: 'in_flag', paramValue:'internal_exam_marks_entered'},
      //     {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
      //     {paramName: 'in_college_id', paramValue: this.feeFormGroup.value.collegeId},
      //     {paramName: 'in_course_id', paramValue: 0},
      //     {paramName: 'in_course_group_id', paramValue:this.feeFormGroup.value.courseGroupId},
      //     {paramName: 'in_course_year_id', paramValue: 0},
      //     {paramName: 'in_academic_year_id', paramValue: 0},
      //     {paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId},
      //   ];
      // }
      // else{
       request = [
        {paramName: 'in_flag', paramValue:'ext_int_exam_marks_entered_count'},
        {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
        {paramName: 'in_college_id', paramValue: this.feeFormGroup.value.collegeId},
        {paramName: 'in_course_id', paramValue: 0},
        {paramName: 'in_course_group_id', paramValue:this.feeFormGroup.value.courseGroupId},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        { paramName: 'in_regulation_id', paramValue: 0 },
        {paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId},
      ];
      // }
  this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.gradesDetailsList = result.data.result[0];
                if(this.check==4){
                    this.AlldisplayedColumns = Object.keys(this.gradesDetailsList[0]);
                    this.AlldisplayedColumns.splice(0, 1);
                }
                    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
                   
                    // this.displayedColumns = Object.keys(this.gradesDetailsList[0]);
                    // this.displayedColumns.splice(0, 1);
                    // this.displayedColumns.splice(1, 1);
                    // this.displayedColumns.splice(2, 1);
                    setTimeout(() =>this.dataSource.paginator = this.paginator);
                     this.dataSource.sort = this.sort;
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
      
    }
    getGradeInternalList(): void {
      let request = []
      this.gradesDetailsList=[];
      if(this.feeFormGroup.valid){
      this.spinner.show();
      this.getColleges();
      if(this.feeFormGroup.value.courseGroupId!=0){
        this.groupCode=this.courseGroups.filter(x=>(x.fk_course_group_id==this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else{
        this.groupCode=''
      }
      if(this.feeFormGroup.value.subjectId!=0){
        this.subjectcode=this.examTimetableSubjectsList.filter(x=>(x.fk_subject_id==this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else{
        this.subjectcode=''
      }
      // if(this.examsList.filter(x=>x.fk_exam_id==this.feeFormGroup.value.examId)[0].is_internal_exam){
      //   this.displayedColumns= ['id', 'course_name', 'course_group', 'academic_year', 'course_year', 'subject_name', 'Student_registered','Int_is_present','Int_mark_entered'];
      //   request = [
      //     {paramName: 'in_flag', paramValue:'internal_exam_marks_entered'},
      //     {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
      //     {paramName: 'in_college_id', paramValue: this.feeFormGroup.value.collegeId},
      //     {paramName: 'in_course_id', paramValue: 0},
      //     {paramName: 'in_course_group_id', paramValue:this.feeFormGroup.value.courseGroupId},
      //     {paramName: 'in_course_year_id', paramValue: 0},
      //     {paramName: 'in_academic_year_id', paramValue: 0},
      //     {paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId},
      //   ];
      // }
      // else{
       request = [
        {paramName: 'in_flag', paramValue:'int_exam_marks_entered_count'},
        {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
        {paramName: 'in_college_id', paramValue: this.feeFormGroup.value.collegeId},
        {paramName: 'in_course_id', paramValue: 0},
        {paramName: 'in_course_group_id', paramValue:this.feeFormGroup.value.courseGroupId},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        { paramName: 'in_regulation_id', paramValue: 0 },
        {paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId},
      ];
      // }
  this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.gradesDetailsList = result.data.result[0];
                    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
                    this.IntdisplayedColumns = Object.keys(this.gradesDetailsList[0]);
                    this.IntdisplayedColumns.splice(0, 1);
                    // this.displayedColumns.splice(1, 1);
                    // this.displayedColumns.splice(2, 1);
                    setTimeout(() =>this.dataSource.paginator = this.paginator);
                     this.dataSource.sort = this.sort;
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
      
    }
    getLabList(): void {
      this.gradesDetailsList=[];
      if(this.feeFormGroup.valid){
      this.spinner.show();
      this.getColleges();
      if(this.feeFormGroup.value.courseGroupId!=0){
        this.groupCode=this.courseGroups.filter(x=>(x.fk_course_group_id==this.feeFormGroup.value.courseGroupId))[0].group_code
      }
      else{
        this.groupCode=''
      }
      if(this.feeFormGroup.value.subjectId!=0){
        this.subjectcode=this.examTimetableSubjectsList.filter(x=>(x.fk_subject_id==this.feeFormGroup.value.subjectId))[0].subject_code
      }
      else{
        this.subjectcode=''
      }
      let request = [
        {paramName: 'in_flag', paramValue:'external_lab_marks_entered'},
        {paramName: 'in_exam_id', paramValue: this.feeFormGroup.value.examId},
        {paramName: 'in_college_id', paramValue: this.feeFormGroup.value.collegeId},
        {paramName: 'in_course_id', paramValue: 0},
        {paramName: 'in_course_group_id', paramValue:this.feeFormGroup.value.courseGroupId},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        { paramName: 'in_regulation_id', paramValue: 0 },
        {paramName: 'in_subject_id', paramValue: this.feeFormGroup.value.subjectId},
      ];
    
      this.crudService.getDetailsByRequest(this.ExamPreModerationUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.gradesDetailsList = result.data.result[0];
                    this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
                    // this.displayedColumns = Object.keys(this.gradesDetailsList[0]);
                    // this.displayedColumns.splice(0, 1);
                    // this.displayedColumns.splice(1, 1);
                    // this.displayedColumns.splice(2, 1);
                    setTimeout(() =>this.dataSource.paginator = this.paginator);
                     this.dataSource.sort = this.sort;
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
    }
  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }
    clear($event: MatRadioChange){
      this.gradesDetailsList=[];
      this.dataSource = new MatTableDataSource<any>(this.gradesDetailsList);
      setTimeout(() =>this.dataSource.paginator = this.paginator);
       this.dataSource.sort = this.sort;
        if ($event.value === 2) {
           this.check=2
        }
        else if($event.value === 1){
           this.check=1

        }else if($event.value === 3){
          this.check=3

        }
        else{
          this.check=4
        }
      this.selectedCollege(this.feeFormGroup.value.collegeId)

    }
     printPage(){
        window.print()
     }
            exportAsExcel(item)
            {
                const uri = 'data:application/vnd.ms-excel;base64,';
                const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
                const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
                const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
                const table = this.excelTable.nativeElement;
                const ctx = { worksheet: 'Worksheet', table: table.innerHTML };
                const link = document.createElement('a');
                if(item=='external'){
                    link.download = `${this.trafoexternalItem}.xls`;
                    link.href = uri + base64(format(template, ctx));
                    link.click();
                }
                else if(item=='internal'){
                  link.download = `${this.trafointernalItem}.xls`;
                  link.href = uri + base64(format(template, ctx));
                  link.click();
                }
                else if(item=='evaluation'){
                    link.download = `${this.trafoItem}.xls`;
                    link.href = uri + base64(format(template, ctx));
                    link.click();
                }
                else{
                  link.download = `${this.alltrafoItem}.xls`;
                  link.href = uri + base64(format(template, ctx));
                  link.click();
                }
            
              
            }
            goBack(){
              this.location.back()
              // this.router.navigate(['admin-examination-management/admin-post-examination/complete-exam-process'])

            }
}
