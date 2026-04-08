import { Component, OnInit } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { catchError } from 'rxjs/operators';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { of, Subject, ReplaySubject } from 'rxjs';
import { ConfimationComponent } from 'app/main/dialogs/confimation/confimation.component';
import { take, takeUntil } from 'rxjs/operators';
import { ExistingExamTimetablesComponent } from './existing-exam-timetables/existing-exam-timetables.component';
@Component({
  selector: 'app-add-exam-timetables',
  templateUrl: './add-exam-timetables.component.html',
  styleUrls: ['./add-exam-timetables.component.scss']
})
export class AddExamTimetablesComponent implements OnInit {

 
  panelOpenState = true;
  private isActive = CONSTANTS.isActive;
  private examtTimetableDetailsUrl = CONSTANTS.examtTimetableDetailsUrl;
  private getExamtimeTableDetailsUrl =CONSTANTS.getExamtimeTableDetailsUrl;
  private collegewisedetailsUrl = CONSTANTS.collegewisedetailsUrl;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private examFeeType = CONSTANTS.examFeeType;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private examTimetablePostUrl = CONSTANTS.examTimetablePostUrl;
  private addexamTimetableLabBatchesUrl = CONSTANTS.addexamTimetableLabBatchesUrl;
  public dateFormate = CONSTANTS.dateFormate;
  private collegeWiseLabDetailsUrl=CONSTANTS.collegeWiseLabDetailsUrl;


  staffForm: FormGroup;
  step = 1;  
  exam: any = {};
  examDetails: any = {};
  courseGroupYears: any[] = [];
  examSessions: any[] = [];
  selectedCourseYears: any[] = [];
  pageParams: any = {};
  subRegulations: any[] = [];
  regulations: any[] = [];
  subjects: any[] = [];
  examFeeTypes: any[] = [];
  examTimetable: any[] = [];
  minDate = this.genericFunctions.moment();
  maxDate = this.genericFunctions.moment();
  examTypeFlag: any = {};
  courseGroups: any;
  dateArray = [];
  arr = [];
  examTimetableList: any[] = [];
  searchSubjects = [];
  filtersDetailsList: any[] = [];
  sessionsList: any[] = [];
  dataList: any[] = [];
  examLabBatches: any[] = [];
  groupList: any[] = [];

  public subjectsFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredSubjects: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute, private storage: LocalStorage) {      

        this.storage.getItem('courseGroups').pipe(
            catchError(() => of()
            ),
          ).subscribe((result) => {
            this.courseGroups = result;
        });
        
        this.route.queryParams
        .subscribe(params => {
            if (!this.isEmptyObject(params)){
                this.pageParams.examFeeStructureId = params.examFeeStructureId;
                this.pageParams.collegeId = params.collegeId;
                this.pageParams.courseId = params.courseId;
                this.pageParams.courseYearId = params.courseYearId;
                this.pageParams.examId = params.examId;
                this.pageParams.academicYearId = params.academicYearId;
                this.pageParams.courseYearName = params.courseYearName;
                this.getFiltersList();
            }
      });
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {         
      this.staffForm = this.formBuilder.group({        
        examSessionId: ['', Validators.required],
        subjectId: ['', Validators.required],
        regulationId: ['', Validators.required],
        examDate: [this.genericFunctions.moment()]      
      });
      
      this.subjectsFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterSub();
      });
      this.searchSubjects.push({subjectName: 'Search by Subject name or Code.'});
      this.filteredSubjects.next(this.searchSubjects.slice());
  }
      
      filterSub(): void {
    if (!this.searchSubjects) {
      return;
    }
    // get the search keyword
    let search = this.subjectsFilterCtrl.value;
    if (!search) {
      this.filteredSubjects.next(this.searchSubjects.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredSubjects.next(
      // this.searchSubjects.filter(x => x.subjectName.toLowerCase().indexOf(search) > -1)
      // tslint:disable-next-line: max-line-length
      this.searchSubjects.filter(x => ((x.subjectName != null && x.subjectName.toLowerCase().indexOf(search) > -1) || (x.subjectCode != null && x.subjectCode.toLowerCase().indexOf(search) > -1)))
    );
  }

  getFiltersList(): void {
    this.filtersDetailsList =[]
    this.sessionsList = []
    this.examSessions=[]
    this.regulations=[]
    this.dataList = [];
    this.searchSubjects = [];
    this.spinner.show()
  //   let request = [
  //     {paramName: 'in_flag', paramValue: 'clg_exam_labsubject_filters'},
  //     {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
  //     {paramName: 'in_university_id', paramValue:0},
  //     {paramName: 'in_college_id', paramValue:this.pageParams.collegeId?this.pageParams.collegeId:0},
  //     {paramName: 'in_course_id', paramValue:   this.pageParams.courseId?this.pageParams.courseId:0},
  //     {paramName: 'in_course_group_id', paramValue: 0},
  //     {paramName: 'in_course_year_id', paramValue: this.pageParams.courseYearId?this.pageParams.courseYearId:0},
  //     {paramName: 'in_group_section_id', paramValue: 0},
  //     {paramName: 'in_academic_year_id', paramValue:this.pageParams.academicYearId?this.pageParams.academicYearId:0},
  //     {paramName: 'in_regulation_id', paramValue:0},
  //     {paramName: 'in_dept_id', paramValue: 0},
  //     {paramName: 'in_isadmin', paramValue: 0},
  //     {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
  //     {paramName: 'in_loginuser_roleid', paramValue: 0},
  //     {paramName: 'in_gm_codes', paramValue:''},
  //     {paramName: 'in_subject', paramValue: ''},
  //     {paramName: 'in_employee', paramValue: ''},
  //   ];

  //   this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  // .subscribe(result =>  {
    let request = [
          
      {paramName: 'in_flag', paramValue: 'clg_exam_labsubject_filters'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: this.pageParams.collegeId?this.pageParams.collegeId:0},
      {paramName: 'in_course_id', paramValue: this.pageParams.courseId?this.pageParams.courseId:0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: this.pageParams.courseYearId?this.pageParams.courseYearId:0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: this.pageParams.academicYearId?this.pageParams.academicYearId:0},
      // {paramName: 'in_regulation_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: 0},
      {paramName: 'in_exam_id', paramValue: this.pageParams.examId?this.pageParams.examId:0},
      {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
      {paramName: 'in_loginuser_roleid', paramValue: 0},
      {paramName: 'in_employee', paramValue: ''},
      {paramName: 'in_subject', paramValue: ''},
      {paramName: 'in_gm_codes', paramValue:''},
    ];
    this.crudService.getDetailsByRequest(this.collegeWiseLabDetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result[0];
              this.sessionsList = result.data.result[1];
              if (this.filtersDetailsList.filter(x => (x.fk_college_id == this.pageParams.collegeId && x.fk_course_id == this.pageParams.courseId 
                && x.fk_course_year_id == this.pageParams.courseYearId && x.fk_exam_id == this.pageParams.examId)).length > 0){
                    this.dataList = this.filtersDetailsList.filter(x => (x.fk_course_id == this.pageParams.courseId 
                    && x.fk_course_year_id == this.pageParams.courseYearId && x.fk_exam_id == this.pageParams.examId)); 
                    if (this.dataList.length > 0){
                        this.minDate = this.genericFunctions.momentWithTime(this.dataList[0].from_date);
                        this.staffForm.get('examDate').setValue(this.dataList[0].from_date);
                        this.maxDate =  this.genericFunctions.momentWithTime(this.dataList[0].to_date);
                        const dayInterval = 1000 * 60 * 60 * 24;
                        this.dateArray = this.getBetweenDates(new Date(this.dataList[0].from_date), new Date(this.dataList[0].to_date), dayInterval);
                        this.getExamTimetables();
                    }
                    
                    
                    for (let i = 0; i < this.sessionsList.length; i++){
                        if (this.examSessions.filter(x => (x.examSessionId === this.sessionsList[i].fk_exam_session_id)).length === 0){
                            this.examSessions.push({
                                examSessionName: this.sessionsList[i].exam_display_session_name,
                                examSessionId: this.sessionsList[i].fk_exam_session_id,
                                sessionStartTime: this.sessionsList[i].session_start_time,
                                sessionEndTime: this.sessionsList[i].session_end_time
                            });
                        }
                    }
                    this.filteredSubjects.next(this.searchSubjects);
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

        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200){
                            if (result.data.resultList && result.data.resultList !== '') {
                                this.examFeeTypes = result.data.resultList;
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

  getExamTimetables(): void{
    this.spinner.show();  
    // this.crudService.listByFourIds(this.getExamtimeTableDetailsUrl, this.pageParams.courseYearId, 
    //     this.pageParams.courseId, this.pageParams.examId,this.pageParams.collegeId, 'courseYearId', 'courseId', 'examId','collegeId')
    //    .subscribe(result => {
    //       this.spinner.hide();
    //       if (result.statusCode === 200){
    //                if (result.data && result.data !== '') {
    //                    this.examTimetableList = result.data;
    let request = [
                 
      {paramName: 'in_flag', paramValue: 'view_timetable'},
      {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: this.pageParams.collegeId?this.pageParams.collegeId:0},
      {paramName: 'in_course_id', paramValue: this.pageParams.courseId?this.pageParams.courseId:0},
      {paramName: 'in_course_group_id', paramValue: 0},
      {paramName: 'in_course_year_id', paramValue: this.pageParams.courseYearId?this.pageParams.courseYearId:0},
      {paramName: 'in_group_section_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      // {paramName: 'in_regulation_id', paramValue: 0},
      {paramName: 'in_dept_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: 0},
      {paramName: 'in_exam_id', paramValue: this.pageParams.examId?this.pageParams.examId:0},
      {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
      {paramName: 'in_loginuser_roleid', paramValue: 0},
      {paramName: 'in_employee', paramValue: ''},
      {paramName: 'in_subject', paramValue: ''},
      {paramName: 'in_gm_codes', paramValue:''},
    ];
    this.crudService.getDetailsByRequest(this.collegeWiseLabDetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.examTimetableList = result.data.result[0];  
                       // tslint:disable-next-line: prefer-for-of
                       for (let i = 0; i < this.examTimetableList.length; i++){
                            if (this.examTimetableList[i].shortName === null || this.examTimetableList[i].shortName === ''){
                                this.examTimetableList[i].shortName = this.examTimetableList[i].subjectCode;
                            } 
                        }
                       // tslint:disable-next-line: prefer-for-of
                       for (let i = 0; i < this.courseGroups.length; i++){
                            this.courseGroups[i].dates = [];
                            const dayInterval = 1000 * 60 * 60 * 24;
                            this.courseGroups[i].dates = this.getBetweenDates(new Date(this.dataList[0].from_date), new Date(this.dataList[0].to_date), dayInterval);
                             // tslint:disable-next-line: prefer-for-of
                            for (let j = 0; j < this.courseGroups[i].dates.length; j++){
                               if (this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                                 x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j]))).length > 0){
                                     // tslint:disable-next-line: max-line-length
                                     this.courseGroups[i].dates[j].subjectDetails = this.examTimetableList.filter(x => (x.courseGroupId === this.courseGroups[i].fk_course_group_id && 
                                         x.examDate === this.genericFunctions.momentFormatYMD1(this.courseGroups[i].dates[j])));
                               }
                            }
                        }
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

  getBetweenDates(startDate, endDate, interval): any{
    const duration = endDate - startDate;
    const steps = duration / interval;
    let array: any = [];
    this.arr = [];
    array = Array.from({length: steps + 1}, (v, i) => new Date(startDate.valueOf() + (interval * i)));
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < array.length; i++){
        array[i].day = this.days[array[i].getDay()];
       // if (array[i].day !== 'SUN'){
        array[i].subjectDetails = [];
        this.arr.push(array[i]);
       // }
    }
    return this.arr;
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

//   selectedExam(): void{
//     this.minDate =  this.genericFunctions.momentWithDateFormatYMD(this.examDetails.fromDate);
//     this.maxDate =  this.genericFunctions.momentWithDateFormatYMD(this.examDetails.toDate);
//     this.staffForm.get('examDate').setValue(this.minDate);
//   }

  selectedSession(examSessionId): void{
    if (examSessionId != null){
        for (let i = 0; i < this.dataList.length; i++){
            // if (this.sessionsList[i].fk_exam_session_id === examSessionId){
                if (this.regulations.filter(x=>(x.regulationId === this.dataList[i].fk_regulation_id)).length === 0){
                    this.regulations.push({
                        regulationId: this.dataList[i].fk_regulation_id,
                        regulationName: this.dataList[i].regulation_code
                    });
                }
            // }
        }
    }
}

  selectedRegulation(regulationId): void{
    if (regulationId != null){
        this.searchSubjects = [];
      for (let i = 0; i < this.dataList.length; i++){
          if (this.dataList[i].fk_regulation_id === regulationId){
          if (this.searchSubjects.filter(x => (x.subjectCode === this.dataList[i].subject_code)).length === 0){
              this.searchSubjects.push({
                  subjectId: this.dataList[i].fk_subject_id,
                  subjectName: this.dataList[i].subject_name,
                  subjectCode: this.dataList[i].subject_code,
                  subject_type: this.dataList[i].subject_type,
                  collegeId: this.dataList[i].fk_college_id,
              });
          }
          }
      }
      this.searchSubjects=this.searchSubjects.filter(x=>(x.subject_type=='LAB')); 
      this.filteredSubjects.next(this.searchSubjects.slice()); 
    }
  }

  selectedSubject(subjectId): void{
    if (subjectId != null){
        let subjectCode = this.searchSubjects.filter(x=>(x.subjectId === subjectId))[0].subjectCode;
        this.courseGroupYears = [];
        this.selectedCourseYears = [];
        this.getExamLabBatches(subjectId, subjectCode);
     }
  }

  
  getExamLabBatches(subjectId, subjectCode): void{

    this.examLabBatches = this.dataList.filter(x=>(x.subject_code === subjectCode && x.fk_eaxm_labbatch_id != null));
    let subjectObj = this.dataList.filter(x => (x.fk_subject_id === subjectId))[0];
    if (this.examLabBatches.length > 0 && subjectObj.subject_type === 'LAB'){
      for(let n = 0; n < this.examLabBatches.length; n++){
                  this.courseGroupYears.push({
                    courseGroupId:  this.examLabBatches[n].fk_course_group_id,
                    groupName:  this.examLabBatches[n].group_code,
                    subjectName:  this.examLabBatches[n].subject_name,
                    subjecttypeName:  this.examLabBatches[n].subject_type,
                    courseYearName:  this.pageParams.courseYearName,
                    regulationName:  this.examLabBatches[n].regulation_code,
                    reg: this.examLabBatches[n].examTypeCatCode,
                    c: false,
                    batch: this.examLabBatches[n].labbatch_name,
                    examLabBatchesId: this.examLabBatches[n].fk_eaxm_labbatch_id,
                    examTimetableDetId:this.examLabBatches[n].fk_exam_timetable_det_id,
                    checked: false,
                    examTypeCatId: this.examLabBatches[n].fk_examtype_catdet_id,
                    examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
                    collegeId: this.pageParams.collegeId,
                    courseYearId: this.pageParams.courseYearId,
                    regulationId: this.staffForm.value.regulationId,
                    subjectId: this.staffForm.value.subjectId,
                    isActive: true
                });
      }

  }
                this.courseGroupYears = this.courseGroupYears.sort((a, b) => 
                  a.groupName.localeCompare(b.groupName)
              );
  
          
                          // let subjectObj = this.dataList.filter(x => (x.fk_subject_id === subjectId))[0];
                          // let isFlag = false;
                          //    //  for (let i = 0; i < this.subRegulations.filter(x => (x.subjectId === subjectId)).length; i++){
                          //          // tslint:disable-next-line: prefer-for-of
                          //          let generalDetailCode;
                          //          let generalDetailId;
                          //          for (let j = 0; j < this.examFeeTypes.length; j++){
                          //                if (this.examFeeTypes[j].generalDetailCode === 'Internal' && subjectObj.is_internal_exam === true) {
                          //                   generalDetailId = this.examFeeTypes[j].generalDetailId;
                          //                   generalDetailCode = this.examFeeTypes[j].generalDetailCode;
                          //                   this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
                          //                }else if (this.examFeeTypes[j].generalDetailCode === 'Regular' && subjectObj.is_regular_exam === true) {
                          //                   generalDetailId = this.examFeeTypes[j].generalDetailId;
                          //                   generalDetailCode = this.examFeeTypes[j].generalDetailCode;
                          //                   this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
                          //                }else if (this.examFeeTypes[j].generalDetailCode === 'Supple' && subjectObj.is_supply_exam === true) {
                          //                   generalDetailId = this.examFeeTypes[j].generalDetailId;
                          //                   generalDetailCode = this.examFeeTypes[j].generalDetailCode;
                          //                   this.createGroup(subjectObj,generalDetailId,generalDetailCode,subjectCode, subjectObj.subject_type);
                          //                }
                          //               // tslint:disable-next-line: max-line-length
                                     
                          //      }

}

createGroup(subjectObj,generalDetailId,generalDetailCode, subjectCode, subjectType){
    this.groupList = [];
      this.groupList = this.dataList.filter(x=> (x.subject_code === subjectCode));
      if (this.examLabBatches.length > 0 && subjectType === 'LAB'){
        for(let n = 0; n < this.examLabBatches.length; n++){
          // this.groupList.map(grp=>{
             if (this.examLabBatches[n].fk_subject_id  ===  this.examLabBatches[n].fk_subject_id){
              if (this.courseGroupYears.filter(x => (x.courseGroupId ===  this.examLabBatches[n].fk_course_group_id 
                  && x.examTypeCatId === generalDetailId && x.examLabBatchesId === this.examLabBatches[n].fk_eaxm_labbatch_id)).length === 0){
                    this.courseGroupYears.push({
                      courseGroupId:  this.examLabBatches[n].fk_course_group_id,
                      groupName:  this.examLabBatches[n].group_code,
                      subjectName:  this.examLabBatches[n].subject_name,
                      subjecttypeName:  this.examLabBatches[n].subject_type,
                      courseYearName:  this.pageParams.courseYearName,
                      regulationName:  this.examLabBatches[n].regulation_code,
                      reg: generalDetailCode,
                      c: false,
                      batch: this.examLabBatches[n].labbatch_name,
                      examLabBatchesId: this.examLabBatches[n].fk_eaxm_labbatch_id,
                      examTimetableDetId:this.examLabBatches[n].fk_exam_timetable_det_id,
                      checked: false,
                      examTypeCatId: generalDetailId,
                      examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
                      collegeId: this.pageParams.collegeId,
                      courseYearId: this.pageParams.courseYearId,
                      regulationId: this.staffForm.value.regulationId,
                      subjectId: this.staffForm.value.subjectId,
                      isActive: true
                  });
              }
            }
          // })
          
        }

        
    }
      // if (this.examLabBatches.length > 0 && subjectType === 'LAB'){
      //       for(let n = 0; n < this.examLabBatches.length; n++){
      //         // this.groupList.map(grp=>{
      //            if (this.examLabBatches[n].fk_subject_id  ===  this.examLabBatches[n].fk_subject_id){
      //             if (this.courseGroupYears.filter(x => (x.courseGroupId ===  this.examLabBatches[n].fk_course_group_id 
      //                 && x.examTypeCatId === generalDetailId && x.examLabBatchesId === this.examLabBatches[n].fk_eaxm_labbatch_id)).length === 0){
      //                   this.courseGroupYears.push({
      //                     courseGroupId:  this.examLabBatches[n].fk_course_group_id,
      //                     groupName:  this.examLabBatches[n].group_code,
      //                     subjectName:  this.examLabBatches[n].subject_name,
      //                     subjecttypeName:  this.examLabBatches[n].subject_type,
      //                     courseYearName:  this.pageParams.courseYearName,
      //                     regulationName:  this.examLabBatches[n].regulation_code,
      //                     reg: generalDetailCode,
      //                     c: false,
      //                     batch: this.examLabBatches[n].labbatch_name,
      //                     examLabBatchesId: this.examLabBatches[n].fk_eaxm_labbatch_id,
      //                     examTimetableDetId:this.examLabBatches[n].fk_exam_timetable_det_id,
      //                     checked: false,
      //                     examTypeCatId: generalDetailId,
      //                     examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
      //                     collegeId: this.pageParams.collegeId,
      //                     courseYearId: this.pageParams.courseYearId,
      //                     regulationId: this.staffForm.value.regulationId,
      //                     subjectId: this.staffForm.value.subjectId,
      //                     isActive: true
      //                 });
      //             }
      //           }
      //         // })
              
      //       }

            
      //   }
      else if (subjectType != 'LAB'){
          this.groupList.map(grp=>{
              if (this.courseGroupYears.filter(x => (x.courseGroupId === grp.fk_course_group_id && x.examTypeCatId === generalDetailId
              )).length === 0){
            this.courseGroupYears.push({
              courseGroupId: grp.fk_course_group_id,
              groupName: grp.group_code,
              subjectName: grp.subject_name,
              subjecttypeName: grp.subject_type,
              courseYearName:  this.pageParams.courseYearName,
              regulationName: grp.regulation_code,
                reg: generalDetailCode,
                c: false,
                batch: null,
                examLabBatchesId: null,
                checked: false,
                examTypeCatId: generalDetailId,
                examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
                // collegeId: this.pageParams.collegeId,
                courseYearId: this.pageParams.courseYearId,
                regulationId: this.staffForm.value.regulationId,
                subjectId: this.staffForm.value.subjectId,
                isActive: true
            });
          }
          });
   }

}

  addExamCourseGroups(): void{
    if (this.examTimetable.length === 0){
    if (this.examTimetable.filter(x => (x.examSessionId === this.staffForm.value.examSessionId)).length > 0){
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.selectedCourseYears.length; i++){
            if (this.examTimetable.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0].examTimetableDetail.filter(y => 
                (y.courseGroupId === this.selectedCourseYears[i].courseGroupId && y.subjectId === this.selectedCourseYears[i].subjectId
                     && y.examTypeCatId === this.selectedCourseYears[i].examTypeCatId)).length === 0){
                    this.examTimetable.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0].examTimetableDetail.push(this.selectedCourseYears[i]);
                    
            }else{
                this.snotifyService.info('Subject is already exists in same group.', 'Info!'); 
            }
          }
          this.selectedCourseYears = [];
          this.unCheckAll();
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.courseGroupYears.length; i++){          
            if (this.courseGroupYears[i].c){
                this.courseGroupYears[i].c = false;
            }
          }
    }else{
      for (let j = 0; j < this.selectedCourseYears.length; j++){
      this.examTimetable.push({
        eaxmLabBatchId:this.selectedCourseYears[j].examLabBatchesId,
        examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
        examSessionId: this.staffForm.value.examSessionId,
        session: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0]?.examsessioninCatCode,
        sessionStartTime: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0]?.sessionStartTime,
        sessionEndTime: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0]?.sessionEndTime,
        isActive: true,
        reason:null,
        groupName:this.selectedCourseYears[j].groupName,
        subjectName:this.selectedCourseYears[j].subjectName,
        subjecttypeName:this.selectedCourseYears[j].subjecttypeName,
        batch:this.selectedCourseYears[j].batch,
        reg:this.selectedCourseYears[j].reg,
        examTimetableDetId:this.selectedCourseYears[j].examTimetableDetId
    });
  }
        // this.examTimetable.push({
        //     examDate: this.genericFunctions.momentFormatYMD1(this.staffForm.value.examDate),
        //     collegeId: this.pageParams.collegeId,
        //     courseId: this.pageParams.courseId,
        //     examSessionId: this.staffForm.value.examSessionId,
        //     session: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0].examsessioninCatCode,
        //     sessionStartTime: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0].sessionStartTime,
        //     sessionEndTime: this.examSessions.filter(x => (x.examSessionId === this.staffForm.value.examSessionId))[0].sessionEndTime,
        //     examId: +this.pageParams.examId,
        //     isActive: true,
        //     examTimetableDetail: this.selectedCourseYears
        // });
        this.selectedCourseYears = [];
        this.unCheckAll();
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.courseGroupYears.length; i++){          
            if (this.courseGroupYears[i].c){
                this.courseGroupYears[i].c = false;
            }
        }
    }
  }else{
    this.snotifyService.info('Save with only one row at a time.', 'Info!'); 
  }
   
  }

  unCheckAll(): void{
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.courseGroupYears.length; i++){
        this.courseGroupYears[i].checked = false;
    }
  }

  deleteExtGrp(main, item, index): void {
    const dialogRef = this.dialog.open(ConfimationComponent, {
        width: '350px',
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details === 'delete') {
            if (index > -1) {
                main.examTimetableDetail.splice(index, 1);
            }
        }
    });
 }

  checkedCourses(check, item): void{
      this.selectedCourseYears = [];
      item.c = check;
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.courseGroupYears.length; i++){          
           if (this.courseGroupYears[i].c){
               this.selectedCourseYears.push(this.courseGroupYears[i]);
           }
      }
  }

  addExamTable(): void{
      if (this.examTimetable.length > 0){
            this.spinner.show();
             /*---------- ADD EXAM TIMETABLE ----------*/
            // this.crudService.add(this.examTimetablePostUrl, this.examTimetable)
            this.crudService.add(this.addexamTimetableLabBatchesUrl, this.examTimetable)
             .subscribe(result => {
                 this.spinner.hide();
                 if (result.statusCode === 200){
                     if (result.success) {
                         if (result.data && result.data.length > 0){
                            this.snotifyService.info('Already same subject is exist for same year.', 'Info!');
                            this.courseGroupYears = [];
                            this.selectedCourseYears = [];
                            this.examTimetable = [];                            
                            this.getExamTimetables();
                            const dialogRef = this.dialog.open(ExistingExamTimetablesComponent, {
                                    width: '650px',
                                    data: result.data
                                });
                         }else{
                            this.snotifyService.success(result.message, 'Success!');
                            this.staffForm.get('subjectId').setValue(0);
                            this.staffForm.get('regulationId').setValue(0);
                            this.subjects = [];
                            this.courseGroupYears = [];
                            this.selectedCourseYears = [];
                            this.examTimetable = [];
                            this.getExamTimetables();
                         }
                     }else{
                         this.snotifyService.info(result.message, 'Info!');
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

   goBack(): void{
    this.router.navigate(['admin-examination-management/admin-exam-masters/exam-lab-timetable'], 
        { queryParams: { 
            collegeId: this.pageParams.collegeId,
            courseId: this.pageParams.courseId ,
            courseYearId: this.pageParams.courseYearId,
            academicYearId: this.pageParams.academicYearId,
            examId: this.pageParams.examId, } });
   }

}
