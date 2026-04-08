import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import { MatDialog } from '@angular/material/dialog';
import { UpdateAnswerpaperStatusComponent } from './update-answerpaper-status/update-answerpaper-status.component';

@Component({
  selector: 'app-update-evaluator-answer-papers-status',
  templateUrl: './update-evaluator-answer-papers-status.component.html',
  styleUrls: ['./update-evaluator-answer-papers-status.component.scss']
})
export class UpdateEvaluatorAnswerPapersStatusComponent implements OnInit {
  displayedColumns: string[] = ['id', 'SerialNumber', 'EvaluatorMarks', 'AnswerSheetCheckDate','CheckAnswerheet','Actions'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE') excelTable: ElementRef;
  private AnswerPapaerUrl = CONSTANTS.getstudentanswerpapersUrl
  private ExamEvaluatorProfileId = CONSTANTS.examEvaluatorProfileIdUrl;
  private ExamTimetableDetId = CONSTANTS.ExamTimetableDetIdUrl
  evaluationUrl = CONSTANTS.evaluationUrl;
  private generalSettingsUrl = CONSTANTS.generalSettingsUrl
 private updateExamEvaluationAssignmentsStatusCatDetIdUrl=CONSTANTS.updateExamEvaluationAssignmentsStatusCatDetIdUrl
  private getExamEvaluationSubjectCodes = CONSTANTS.getExamEvaluationCodesUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive = CONSTANTS.isActive;

  evaluatorsubjectform:FormGroup;
  evaluatorForm:FormGroup;

  NewPaper = CONSTANTS.NewPaper;
  Assigned = CONSTANTS.Assigned;
  InProgress = CONSTANTS.InProgress;
  Evaluated = CONSTANTS.Evaluated;
  Approved = CONSTANTS.Approved;
  FinishPaper = CONSTANTS.FinishPaper;
  RejectPaper = CONSTANTS.RejectPaper;
  
  examSubjects = [];
  subjects = [];
  subjectsData = [];
  evaluatorsList = [];
  evaluators = [];
  evaluatorsData = [];
  startDate;
  endDate;
  step = 0;
  evaluatedReport = [];
  subjectCode = '';
  Evaluatorname = '';
  userName = '';
  collegesLogoList = [];
  Logo;
  orgCode = '';
  studentsList = [];
  subjectname = '';
  AssignStudentDataList = []
  bulk: boolean = false;
  evaluatedDuplicateReport=[];
  examYear=[];
  examMonthYear=[];
  evaluatorSubjects=[];
  generalSettings=[];
  settingValue: any;
  stdAnswerPaper=[];
  timeTableId: any;
  assignEvaluator: any;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
     private genericFunctions: GenericFunctions,private dialog: MatDialog,) { 
      this.startDate = new Date();
      this.orgCode = localStorage.getItem('orgCode');
     }

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      examMnthYear:['',Validators.required],
      subjectCode:['',Validators.required],
      inevalutorprofileid:['',Validators.required],
      fDate: [this.genericFunctions.moment()],
      tDate: [this.genericFunctions.moment()],
    })

    this.evaluatorsubjectform = this.formBuilder.group({
      in_orgid:1,
      in_fdate:['1990-01-01'],
      in_tdate:['1990-01-01'],
      in_exam_month_yr:[''],
      in_course_code:[''],
      in_course_year_code:[''],
      in_subject_code:[''],
      in_evalutor_profileid:0,
      in_exam_date:'1990-01-01',
      in_regulation_code:''
    });
    this.getFilters();
    // this.getGeneralSettings()
  }
            /* -------- FILTERS DATA SP -------*/
getFilters(): void{
        this.spinner.show();
        let empId = +localStorage.getItem('employeeId');
        this.crudService.listByEighteenIds(this.getExamEvaluationSubjectCodes, 
              'filter_univexam_evaluator_moderator' ,
              this.evaluatorsubjectform.value.in_orgid, 
            this.evaluatorsubjectform.value.in_fdate, 
            this.evaluatorsubjectform.value.in_tdate, 
            '', 
            '',
            '', 
            '',
           0,
            this.evaluatorsubjectform.value.in_exam_date,
            this.evaluatorsubjectform.value.in_regulation_code,
            0,0,0,'','',1,empId,
            'in_flag', 'in_orgid' ,'in_fdate', 'in_tdate', 'in_exam_month_yr', 'in_course_code', 'in_course_year_code','in_subject_code', 'in_evalutor_profileid','in_exam_date','in_regulation_code','in_emp_id','in_questionpaper_id','in_evaluator_role_id','in_academic_year',
            'in_exam_short_name','in_affiliatedto_catdet_id','in_loginuser_empid'
            )
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.data && result.data !== '' && result.data.result.length > 0) {
                      this.examSubjects = result.data.result[0]; 
                      if(this.examSubjects && this.examSubjects.length > 0){
                        const examMnthYear = this.examSubjects.map(({ exam_month_yr }) => exam_month_yr);
                        this.examYear = this.examSubjects.filter(({ exam_month_yr }, index) =>
                           !examMnthYear.includes(exam_month_yr, index + 1));
                        this.examMonthYear = this.examSubjects.filter(({ exam_month_yr }, index) =>
                          !examMnthYear.includes(exam_month_yr, index + 1));
                        if(this.examMonthYear && this.examMonthYear.length > 0){
                          this.evaluatorForm.get('examMnthYear').setValue(this.examMonthYear[0].exam_month_yr);
                          this.selectedexamYear(this.evaluatorForm.value.examMnthYear);
                        }
                      }
                   
                      // this.snotifyService.success(result.message, 'Success!');  
  
                  } else {
                      // this.snotifyService.success(result.message, 'Success!');  
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
      selectedexamYear(examMnthYear){
                this.evaluatorSubjects = []
                this.subjectsData = []
                this.evaluatorForm.get('subjectCode').setValue('');
                  this.evaluatorSubjects = this.examSubjects.filter(x=>(x.exam_month_yr ===  this.evaluatorForm.value.examMnthYear));
                        const subjectCode = this.evaluatorSubjects.map(({ evaluator_subject_code }) => evaluator_subject_code);
                        this.subjects = this.evaluatorSubjects.filter(({ evaluator_subject_code }, index) =>
                           !subjectCode.includes(evaluator_subject_code, index + 1));
                        this.subjectsData = this.evaluatorSubjects.filter(({ evaluator_subject_code }, index) =>
                          !subjectCode.includes(evaluator_subject_code, index + 1));
                        if(this.subjectsData && this.subjectsData.length > 0){
                          this.evaluatorForm.get('subjectCode').setValue(this.subjectsData[0].evaluator_subject_code);
                          this.selectedsubject(this.evaluatorForm.value.subjectCode);
                        }
      }
      searchdata(value) { 
        this.subjectsData = []
       this.search(value);
        }
      search(value: string) { 
        let filter = value.toLowerCase();
        for ( let i = 0 ; i < this.subjects.length; i++ ) {
            let option = this.subjects[i];
            if (option.evaluator_subject_code.toLowerCase().indexOf(filter) >= 0) {
                this.subjectsData.push( option );
            }else if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
              this.subjectsData.push( option );
          }
        }
      }
 selectedsubject(subjectCode){
  this.evaluatedReport = [];
  this.evaluatorForm.get('inevalutorprofileid').setValue('');
  this.dataSource = new MatTableDataSource<any>([]);
  this.evaluatorsList = [];
  this.evaluators = [];
  this.evaluatorsData = [];
  this.evaluatorsList = this.examSubjects.filter(x=>(x.evaluator_subject_code ===  this.evaluatorForm.value.subjectCode));
  const evaluators_data = this.evaluatorsList.map(({ user_name }) => user_name);
  this.evaluators = this.evaluatorsList.filter(({ user_name }, index) =>
  !evaluators_data.includes(user_name, index + 1));
  this.evaluatorsData = this.evaluatorsList.filter(({ user_name }, index) =>
    !evaluators_data.includes(user_name, index + 1));
  if(this.evaluatorsData && this.evaluatorsData.length > 0){
    this.evaluatorForm.get('inevalutorprofileid').setValue(this.evaluatorsData[0].fk_exam_evaluator_profile_id)
    this.dateChange();
    this.getCollegeLogo();
    this.selectedEvaluator()
  }
  
 }
 dateChange(){
  this.evaluatedReport = [];
  this.dataSource = new MatTableDataSource<any>([]);
  this.endDate=this.evaluatorForm.value.tDate;
 }
 searchEvaluator(value){
  this.evaluatorsData = [];
  this.evaluatorsFiltr(value);
 }
 evaluatorsFiltr(value: string) { 
  let filter = value.toLowerCase();
  for ( let i = 0 ; i < this.evaluators.length; i++ ) {
      let option = this.evaluators[i];
      if (option.evaluator_name.toLowerCase().indexOf(filter) >= 0) {
          this.evaluatorsData.push( option );
      }else if(option.user_name.toLowerCase().indexOf(filter) >= 0){
        this.evaluatorsData.push( option );
      }
  }
}
 selectedEvaluator(){
  this.evaluatedReport = [];
  this.dataSource = new MatTableDataSource<any>([]);
  this.subjectCode = this.subjects.filter(x=>(x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.evaluator_subject_code;
  this.subjectname = this.subjects.filter(x=>(x.evaluator_subject_code === this.evaluatorForm.value.subjectCode))[0]?.subject_name;
  this.Evaluatorname = this.evaluators.filter(x=>(x.fk_exam_evaluator_profile_id === this.evaluatorForm.value.fk_exam_evaluator_profile_id))[0]?.evaluator_name;
  this.timeTableId = this.evaluators.filter(x=>(x.fk_exam_evaluator_profile_id === this.evaluatorForm.value.inevalutorprofileid))[0]?.fk_exam_timetable_det_id;
  this.userName = this.evaluators.filter(x=>(x.fk_exam_evaluator_profile_id === this.evaluatorForm.value.fk_exam_evaluator_profile_id))[0]?.user_name
  console.log(this.timeTableId);
  
 }
 

 applyFilter(filterValue) {
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
    this.dataSource.paginator.firstPage();
  }
}
getCollegeLogo(): void{
  this.collegesLogoList = [];
  /*----------- COLLEGES -----------*/
  this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
       .subscribe(result => {
           if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.collegesLogoList = result.data.resultList;    
                      //  for(let i=0; i<this.colleges.length; i++){
                        this.Logo = this.collegesLogoList[0].logo
                      //  }    
                                    
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
clickEvent(row,list) {
  // this.AssignStudentDataList = []
  // if (list === 'CompletedList') {
  //   this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id && x.evaluated_totalmarks!=null));
  // }
  // else{
  //   this.AssignStudentDataList = this.studentsList.filter(x => (x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id ));
  // }
  // // this.Barcode = row;
  // const dialogRef = this.dialog.open(EvaluatorAnswerSheetsComponent, {
  //   width: '750px',
  //   data: {
  //     details : row,
  //     studentList :this.AssignStudentDataList
  //   }
  // });

  // dialogRef.afterClosed().subscribe(details => {
  // });
}
  
getGeneralSettings(){
  localStorage.setItem('settingValue', '');
  this.crudService.listDetailsById(this.generalSettingsUrl, 'EVALPDFSTARTEND', 'settingCode')
  .subscribe(result => {
     if (result.statusCode === 200){
          if (result.data.resultList && result.data.resultList.length > 0) {
              this.generalSettings = result.data.resultList;
              if (this.generalSettings.length > 0){
                this.settingValue = this.generalSettings[0].settingValue
              }else{
                this.snotifyService.error("Evaluation settings are missing, please contact your admin.", 'Error!');

              }
              
          }
     }
  });
}
getAnswerPaper(): void {
  if(this.timeTableId !=undefined){
  this.stdAnswerPaper=[]
  this.crudService.ListDetailsByTwo(this.AnswerPapaerUrl, this.ExamEvaluatorProfileId, this.ExamTimetableDetId, this.evaluatorForm.value.inevalutorprofileid, this.timeTableId)
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '') {
          this.snotifyService.success(result.message, 'Success!');
          for (let i = 0; i < result.data.length; i++) {
            let evaluationStatusCatDetId = result.data[i]?.exam_evauation_assignment_details.evaluationStatusCatDetId;
            if(result.data[i]?.exam_std_answer_paper_details.studentAnswerPath == null){
              evaluationStatusCatDetId = 'Path';
              const row = {
                "examEvaluationAssignmentId": result.data[i]?.exam_evauation_assignment_details.examEvaluationAssignmentId,
                "studentAnswerPaperId": result.data[i]?.exam_evauation_assignment_details.studentAnswerPaperId,
                "studentAnswerPath": result.data[i]?.exam_std_answer_paper_details.studentAnswerPath,
                "omrSerialNo": result.data[i]?.exam_std_answer_paper_details.omrSerialNo,
                "evaluatedTotalMarks": result.data[i]?.exam_evauation_assignment_details.evaluatedTotalMarks,
                "answerSheetCheckDate": result.data[i]?.exam_evauation_assignment_details.answerSheetCheckDate,
                "evaluatedAnswerPaperPath": result.data[i]?.exam_evauation_assignment_details.evaluatedAnswerPaperPath,
                "evaluationStatusCatDetId": evaluationStatusCatDetId,
                "settingValue": this.settingValue 
              }
              this.stdAnswerPaper.push(row);
            }
            // else if (evaluationStatusCatDetId === null || evaluationStatusCatDetId === this.InProgress || evaluationStatusCatDetId === this.Assigned || evaluationStatusCatDetId === this.RejectPaper || evaluationStatusCatDetId === this.Evaluated) {
              else{
              const row = {
                "examEvaluationAssignmentId": result.data[i]?.exam_evauation_assignment_details.examEvaluationAssignmentId,
                "studentAnswerPaperId": result.data[i]?.exam_evauation_assignment_details.studentAnswerPaperId,
                "studentAnswerPath": result.data[i]?.exam_std_answer_paper_details.studentAnswerPath,
                "omrSerialNo": result.data[i]?.exam_std_answer_paper_details.omrSerialNo,
                "evaluatedTotalMarks": result.data[i]?.exam_evauation_assignment_details.evaluatedTotalMarks,
                "answerSheetCheckDate": result.data[i]?.exam_evauation_assignment_details.answerSheetCheckDate,
                "evaluatedAnswerPaperPath": result.data[i]?.exam_evauation_assignment_details.evaluatedAnswerPaperPath,
                "evaluationStatusCatDetId": evaluationStatusCatDetId,
                "settingValue": this.settingValue,
                "evaluationStatusByProfileId": result.data[i]?.evaluationStatusByProfileId
              }
              this.stdAnswerPaper.push(row);
              
            }
          
          }
          const sortWithWord = (words: any, firstWord: any) => words.sort((a: any, b: any) => {
            //   if (a.evaluationStatusCatDetId === firstWord) return -1;
               return a.evaluationStatusCatDetId - b.evaluationStatusCatDetId;
             });
   
          this.stdAnswerPaper = sortWithWord(this.stdAnswerPaper, this.Evaluated);
          
          this.dataSource = new MatTableDataSource(this.stdAnswerPaper);
          this.dataSource.paginator = this.paginator;
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
exportAsExcel()
{
  const ws: XLSX.WorkSheet=XLSX.utils.table_to_sheet(this.excelTable.nativeElement);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  /* save to file */
  XLSX.writeFile(wb, 'Daily Evaluated Report.xlsx');
  
}
printPage(){
  this.bulk = false
  setTimeout(() => {
  window.print();
  }, 500);
 
}
printBulk(){
  this.bulk = true
  setTimeout(() => {
    window.print();
  }, 500);


}
editDialog(row){
  this.assignEvaluator=[]
  const dialogRef = this.dialog.open(UpdateAnswerpaperStatusComponent, {
    width: '400px',
    data: {}
    });
      dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
          // details.evaluationStatusCatDetId= details.evaluationStatus,
          // details.examEvaluationAssignmentId=row.examEvaluationAssignmentId,
          // details.isActive=true,
          // details.evaluationStatusByProfileId=row.evaluationStatusByProfileId
          //   // // details.examEvaluationAssignmentId = this.rowdata.evaluationStatusByProfileId;
          //   // examEvaluationAssignmentId
          //   //  this.Updatedata();
          //   console.log(details);
            this.assignEvaluator.push({
              evaluationStatusCatDetId: details.evaluationStatus,
              examEvaluationAssignmentId:row.examEvaluationAssignmentId,
              isActive:true,
              evaluationStatusByProfileId:row.evaluationStatusByProfileId
            }) 
            this.Updatedata(this.assignEvaluator)
        }
    });
  }
            /* -------- UPDATE DATA -------*/
  Updatedata(data): void{
    this.crudService.update(this.updateExamEvaluationAssignmentsStatusCatDetIdUrl, data)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200 && result.success==true){
            // if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getAnswerPaper();
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
}
