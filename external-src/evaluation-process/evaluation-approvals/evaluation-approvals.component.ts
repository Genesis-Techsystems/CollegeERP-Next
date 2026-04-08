import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as _ from 'lodash';
import { UpdateStatusComponent } from './update-status/update-status.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-evaluation-approvals',
  templateUrl: './evaluation-approvals.component.html',
  styleUrls: ['./evaluation-approvals.component.scss']
})
export class EvaluationApprovalsComponent implements OnInit {

  displayedColumns: string[] = ['mark','id', 'omr_serial_no', 'aswersheetcheckdate', 'evaluationtime_sec','evaluated_totalmarks','evaluated_answerpaper_path','EvaluationStatus'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('uploadXl') uploadXl: ElementRef;
  examTimetableList: any[] = []
  private ExamEvaluationAssignmentsCrudUrl=CONSTANTS.ExamEvaluationAssignmentsCrudUrl;
  private getExamEvaluationCodesUrl=CONSTANTS.getExamEvaluationCodesUrl;
  private isActive = CONSTANTS.isActive;
  examEvaluationList1=[]
  selectedSubjects=[]
  step = 0; 
  flag:boolean
 private addexamevaluatorsUrl=CONSTANTS.addexamevaluatorsUrl;
 examSubjects: any;
 monthYear=[];
 courseCode: any;
 courseyearcode: any;
 evaluatorForm: FormGroup;
 subjectcode: any;
 getevaluatorList: any;
 ListExamSubjects: any;
 monthYear1=[];
 collegeCode=[];
 evaluatorName=[];
 configuredData=[];
 NotconfiguredData=[];
 timetable_det_ids: any;
 assignEvaluator=[];
 courseyearcode1=[];
 subjectcode1=[];
 examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;
  searchExams=[];
  EvaluationApprovalList=[];
  Barcode: any;
  data: any;
  duplicateCourseGroups: any=[];
  examDetails: ExamMaster;
  examAnswerPapaerList: any=[];
  PaperCount: any;
  check = false;
  evaluationListData=[];
  profileIds:any;
  StudentEvaluationAssignment=[];
  UnAssinged=0;
  totalStudents=0;
  divisionCount=0;
  profileIds1= [];
  checksubject= false;
  profile:'';
  EvaluationStudents=0;
  runButton: boolean=false;
  miniopath = CONSTANTS.MINIO
  rowdata: any;
  generalDetailsByCodeUrl=CONSTANTS.generalDetailsByCodeUrl
  updateExamEvaluationAssignmentsStatusCatDetIdUrl=CONSTANTS.updateExamEvaluationAssignmentsStatusCatDetIdUrl
  Finalized=CONSTANTS.Finalized
  private ExamEvaluationProfileUrl=CONSTANTS.ExamEvaluatorsProfileUrl;

  // isActive=CONSTANTS.isActive;
  evaluationStatusData: any;
  SelectedApprovalList=[];
  ViewButton: boolean;
  profileId: number;
  private EvaluatorDetail=CONSTANTS.EvaluatorDetailsUrl;
  private UserIdUrl=CONSTANTS.userByIdUrl;
  evaluatorProfile=[];
  filtersdata: any;
  paramsdata: any;
  evaluatordata: any;
  setfilters: any;
  setevaluator: any;
  evaluators = [];
  evaluatorsfilter: any;
  monthyear: any;
  evalAdmin: string;
  evaluatorProfileId: any;
  evaluatorsData = []
  examDataList: any[];
  examList: any[];
  examDuplicateList: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,private parameterservice:ParametersService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
  }
  

       ngOnInit(): void {
        this.evalAdmin = localStorage.getItem('userRole');
    this.evaluatorForm = this.formBuilder.group({
        CourseCode:['',Validators.required],
        examId:['',Validators.required],
        CourseYear:[''],
        subjectCode:[''],
        in_evalutor_profileid:['',Validators.required],
      })
 
  this.getList();
  this.getEvaluationList();
  this.dataSource = new MatTableDataSource<any>(this.EvaluationApprovalList);
  setTimeout(()=>this.dataSource.paginator = this.paginator);
  this.dataSource.sort = this.sort;

  if(this.parameterservice.moderatorapproval && this.parameterservice.moderatorevaluator ){
    this.setfilters = this.parameterservice.moderatorapproval;
    this.setevaluator = this.parameterservice.moderatorevaluator;
  }
  }
            /* -------- FILTERS DATA SP -------*/
  getList(): void{
if(this.evalAdmin == 'ExamAdmin'){
this.evaluatorProfileId = 0
}else{
  this.evaluatorProfileId = localStorage.getItem('examEvaluatorProfileId')
}
    this.evaluators=[]
    this.spinner.show();
    this.flag = false;
  
      let request = [
        {paramName: 'in_flag', paramValue: 'filter_univexam_evaluator_moderator'},
        {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_fdate', paramValue: '1990-01-01'},
        {paramName: 'in_tdate', paramValue: '1990-01-01'},
        {paramName: 'in_evalutor_profileid', paramValue: 0},
        {paramName: 'in_exam_date', paramValue: '1990-01-01'},
        {paramName: 'in_emp_id', paramValue: 0},
        {paramName: 'in_questionpaper_id', paramValue: 0},
        {paramName: 'in_evaluator_role_id', paramValue: 0},
        {paramName: 'in_academic_year', paramValue: ''},
        {paramName: 'in_exam_short_name', paramValue: ''},
        {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
        {paramName: 'in_exam_id', paramValue: 0},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_subject_id', paramValue:0},
        {paramName: 'in_regulation_id', paramValue:0},
        {paramName: 'in_course_id', paramValue:0},
        {paramName: 'in_academic_year_id', paramValue:0},
        {paramName: 'in_loginuser_empid', paramValue:+localStorage.getItem('employeeId')} 
           
      ];
      this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
      .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.examSubjects =  result.data.result[0];
                    // this.monthYear=this.examSubjects
                         const courseCodeData = this.examSubjects.map(({ fk_course_id }) => fk_course_id);
                        this.courseCode = this.examSubjects.filter(({ fk_course_id }, index) =>
                     !courseCodeData.includes(fk_course_id, index + 1)); 
                     this.evaluatorForm.get('CourseCode').setValue(this.courseCode[0]?.fk_course_id)
                     this.selectedCourse(this.evaluatorForm.value.CourseCode);

                   this.snotifyService.success(result.message, 'Success!');  

                } else {
                   this.snotifyService.success(result.message, 'Success!');  
                }
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
            /* --------DISTINCT EXAM MONTH YEAR -------*/
  selectedCourse(courseCodeId){
    this.flag = false;
    this.evaluators=[]
      this.examDataList=[];
      this.examList=[];
      this.examDuplicateList=[]
      this.evaluatorForm.get('examId').setValue('')
      this.evaluatorForm.get('in_evalutor_profileid').setValue('')
      for(let i=0;i<this.examSubjects.length;i++){
        if(this.examSubjects[i].fk_course_id==courseCodeId){
              this.examDataList.push(this.examSubjects[i])
              const examData = this.examDataList.map(({ fk_exam_id }) => fk_exam_id);
              this.examList = this.examDataList.filter(({ fk_exam_id }, index) =>
              !examData.includes(fk_exam_id, index + 1));
              this.examDuplicateList=this.examList
              // this.examList = this.examList.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
              // this.examDuplicateList=this.examList.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
        }
}
      this.evaluatorForm.get('examId').setValue(this.examList[0].fk_exam_id)
      if(this.parameterservice.moderatorapproval){
        // this.evaluatorForm.get('ExamMonthYear').setValue(this.setfilters.examMonthYear)
        this.evaluatorForm.get('examId').setValue(this.setfilters.examId)

      }
      this.getEvaluators(this.evaluatorForm.value.examId)
    }
     //---------- SEARCH EXAM MONTH YEAR ----------//
   
  searchExam(value) {
    this.examDuplicateList = []
    this.searchExamdata(value);
  }
  searchExamdata(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examList.length; i++) {
      let option = this.examList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
     //---------- DISTINCT EVALUATOR ----------//
    getEvaluators(exam_month_yr){
      this.flag = false;
      this.evaluatorForm.get('in_evalutor_profileid').setValue('')
      this.evaluatorsfilter=[];
      this.evaluators = [];
      for(let i=0;i<this.examSubjects.length;i++){
        if(this.examSubjects[i].exam_month_yr==exam_month_yr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
              this.evaluatorsfilter.push(this.examSubjects[i])
              const evaluators_data = this.evaluatorsfilter.map(({ evaluator_name }) => evaluator_name);
              this.evaluators = this.evaluatorsfilter.filter(({ evaluator_name }, index) =>
              !evaluators_data.includes(evaluator_name, index + 1));
              this.evaluatorsData = this.evaluatorsfilter.filter(({ evaluator_name }, index) =>
              !evaluators_data.includes(evaluator_name, index + 1));
        }
  }
  this.evaluatorForm.get('in_evalutor_profileid').setValue(this.evaluators[0].fk_exam_evaluator_profile_id)
  if(this.parameterservice.moderatorevaluator){
    this.evaluatorForm.get('in_evalutor_profileid').setValue(this.setevaluator.fk_exam_evaluator_profile_id)
    this.getApprovalsList();
  }
    }
     //---------- SEARCH EVALUATORS ----------//
  searchEvaluators(value){
    this.evaluatorsData = [];
    this.searchevaluardata(value)
    }
  searchevaluardata(value:string){
    let filter = value.toLowerCase()
    for(let i =0; i < this.evaluators.length;i++){
      let option = this.evaluators[i];
      if(option.evaluator_name.toLowerCase().indexOf(filter) > 0){
        this.evaluatorsData.push(option);
      }
    }
  }
            /* --------DISTINCT COURSE YEAR CODE -------*/
    selectedMonthyr(exam_month_yr){
      this.courseyearcode1=[]
      this.courseyearcode=[]
      this.evaluatorForm.get('CourseYear').setValue('')
      this.evaluatorForm.get('subjectCode').setValue('')
      this.flag = false;
  
      for(let i=0;i<this.examSubjects.length;i++){
        if(this.examSubjects[i].exam_month_yr==exam_month_yr && this.examSubjects[i].course_code==this.evaluatorForm.value.CourseCode){
              this.courseyearcode1.push(this.examSubjects[i])
              const courseyearcode = this.courseyearcode1.map(({ course_year_code }) => course_year_code);
              this.courseyearcode = this.courseyearcode1.filter(({ course_year_code }, index) =>
                 !courseyearcode.includes(course_year_code, index + 1));
        }
    }
    }
    selectedEvaluator(){
      this.SelectedApprovalList=[];
      this.EvaluationApprovalList=[];
      this.displayedColumns = [];
      this.flag = false;
      this.dataSource = new MatTableDataSource([]);
    }
            /* --------GET APPROVE LIST -------*/
    getApprovalsList(){
      this.SelectedApprovalList=[];
      this.EvaluationApprovalList=[];
      this.displayedColumns = [];
        if ( this.evaluatorForm.valid){
            let request = [
              {paramName: 'in_flag', paramValue: 'list_evaluationApprovalstudent_list'},
              {paramName: 'in_orgid', paramValue:+localStorage.getItem('organizationId')},
              {paramName: 'in_fdate', paramValue: '1990-01-01'},
              {paramName: 'in_tdate', paramValue: '1990-01-01'},
              {paramName: 'in_evalutor_profileid', paramValue: 0},
              {paramName: 'in_exam_date', paramValue: '1990-01-01'},
              {paramName: 'in_emp_id', paramValue: 0},
              {paramName: 'in_questionpaper_id', paramValue: 0},
              {paramName: 'in_evaluator_role_id', paramValue: 0},
              {paramName: 'in_academic_year', paramValue: ''},
              {paramName: 'in_exam_short_name', paramValue: ''},
              {paramName: 'in_affiliatedto_catdet_id', paramValue: 0},
              {paramName: 'in_exam_id', paramValue: 0},
              {paramName: 'in_course_year_id', paramValue: 0},
              {paramName: 'in_subject_id', paramValue:0},
              {paramName: 'in_regulation_id', paramValue:0},
              {paramName: 'in_course_id', paramValue:0},
              {paramName: 'in_academic_year_id', paramValue:0},
              {paramName: 'in_loginuser_empid', paramValue:+localStorage.getItem('employeeId')} 
                 
            ];
            this.crudService.getDetailsByRequest(this.getExamEvaluationCodesUrl, '', request, '&')
            .subscribe(result => {
            this.flag = true;
               this.spinner.hide();
               if (result.statusCode === 200){
                    if (result.data && result.data !== '' && result.data.result.length > 0) {
                        this.EvaluationApprovalList =  result.data.result[0];
                       this.dataSource = new MatTableDataSource(this.EvaluationApprovalList);
                       setTimeout(()=>this.dataSource.paginator = this.paginator);
                       if(this.EvaluationApprovalList.filter(x=>x.evaluationstatus=='Evaluated').length>0){
                           this.ViewButton=true
                            this.displayedColumns = ['mark','id', 'omr_serial_no', 'aswersheetcheckdate', 'evaluationtime_sec','evaluated_totalmarks','evaluated_answerpaper_path','EvaluationStatus'];
    
                       }
                       else{
                        this.ViewButton=false
                       this.displayedColumns = ['id', 'omr_serial_no', 'aswersheetcheckdate', 'evaluationtime_sec','evaluated_totalmarks','evaluated_answerpaper_path','EvaluationStatus'];
    
                       }
    
                       this.dataSource.paginator = this.paginator;
                       this.dataSource.sort = this.sort;
                       this.snotifyService.success(result.message, 'Success!');
      
                    } else {
                      this.EvaluationApprovalList=[]
                        this.snotifyService.success(result.message, 'Success!');  
                    }
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
          /* -------- TIME FORMAT -------*/
      numberToTime(time2: number) {
        const hours = Math.floor(time2 / 3600);
        const minutes = Math.floor((time2 % 3600) / 60);
        const seconds = time2 % 60;
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        const timeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        return timeString;
      }
            /* -------- GET USER DETAILS -------*/
getEvaluationList(){
  let userId= +localStorage.getItem('userId');
  this.crudService.listDetailsById(this.ExamEvaluationProfileUrl,userId,'user.userId')
  .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200){
          if (result.data && result.data !== '') {
              this.snotifyService.success(result.message, 'Success!');
              this.evaluatorProfile = result.data.resultList;
             this.profileId=this.evaluatorProfile[0]?.examEvaluatorProfileId
          }
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
            /* -------- UPDATE STATUS -------*/
UpdateStatus(data): void {
    const dialogRef = this.dialog.open(UpdateStatusComponent, {
    width: '400px',
    data: {}
    });
      dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            // details.examEvaluationAssignmentId = this.rowdata.pk_exam_evaluationassignment_id;
             this.Updatedata();
        }
    });
  }
            /* -------- UPDATE DATA -------*/
  Updatedata(): void{
    this.assignEvaluator=[]
    if(this.evalAdmin == 'ExamAdmin'){
      this.profileId = this.evaluatorForm.value.in_evalutor_profileid;
    }
    for(let j=0;j<this.SelectedApprovalList.length;j++){
      this.assignEvaluator.push({
        evaluationStatusCatDetId: this.Finalized,
        examEvaluationAssignmentId:this.SelectedApprovalList[j].pk_exam_evaluationassignment_id,
        isActive:true,
        evaluationStatusByProfileId:this.profileId
      })
    }
    // const Obj={evaluationStatusCatDetId:0,isActive:true,omrSerialNo:0,evaluatedAnswerPaperPath:0,evaluationTime:0,evaluatedTotalMarks:0,answerSheetCheckDate:0}
    // Obj.evaluationStatusCatDetId= this.Finalized,
    // Obj.omrSerialNo=details.omr_serial_no,
    // Obj.evaluatedAnswerPaperPath=details.evaluated_answerpaper_path,
    // Obj.evaluationTime=details.evaluationtime_sec,
    // Obj.evaluatedTotalMarks=details.evaluated_totalmarks,
    // Obj.answerSheetCheckDate=details.answersheetcheckdate,
    // Obj.answerSheetCheckDate=details.answersheetcheckdate,
    // Obj.isActive=true
    // this.crudService.updateDetails(this.ExamEvaluationAssignmentsCrudUrl, Obj, details.pk_exam_evaluationassignment_id, 'examEvaluationAssignmentId')
    this.crudService.update(this.updateExamEvaluationAssignmentsStatusCatDetIdUrl, this.assignEvaluator)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200 && result.success==true){
            // if (result.data && result.data !== '') {
                this.flag = false;
                this.snotifyService.success(result.message, 'Success!');
                this.getApprovalsList();
            // }
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
            /* -------- MAT-TABLE SEARCH -------*/
applyFilter(filterValue){
  this.dataSource.filter = filterValue.trim().toLowerCase();
  if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
  }
}
            /* -------- CHECKBOX FUNCTIONALITY -------*/
  checkedItems(check, index, item): void{ 
    if(check==true){
       this.SelectedApprovalList.push(item)
    }
     for (let i = 0; i < this.SelectedApprovalList.length; i++){
       if(check==false){
          if(this.SelectedApprovalList[i].fileName==item.fileName){
            this.SelectedApprovalList.splice(i, 1);
          }
         }
         else{
          // this.uploadedFilesData1.push(this.uploadedFilesData)
         }
       }
     }
            /* -------- MARK ALL FOR CHECKBOX -------*/
     markItems(): void{
      this.SelectedApprovalList=[]
      for (let i = 0; i < this.EvaluationApprovalList.length; i++){
        if (this.checksubject){
          this.EvaluationApprovalList[i].checked = true;
          if(this.EvaluationApprovalList[i].evaluationstatus=='Evaluated'){
            this.SelectedApprovalList.push(this.EvaluationApprovalList[i]);
          }
        }else{
          this.EvaluationApprovalList[i].checked = false;
          this.checksubject=false
          this.SelectedApprovalList=[]
        }
     }
    }
            /* -------- OPEN ANSWER PAPER POPUP -------*/
  openFile(path): void{
    window.open(this.miniopath+path,'_blank','width=700,height=600');
  }
            /* -------- NAVIGATE TO DASHBOARD -------*/
  gotoDashboard(){
    this.router.navigate(['/main-dashboard/main-dashboard'])
  }
  }