import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-upload-exam-omr',
  templateUrl: './upload-exam-omr.component.html',
  styleUrls: ['./upload-exam-omr.component.scss']
})
export class UploadExamOmrComponent implements OnInit {

  displayedColumns: string[] = ['id', 'filename', 'status', 'view'];
  step = 0
  wrongFilesList = [];
  filesList = [];
  uploadedFiles = [];

  private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
  private getAnswerPaperUploadUrl = CONSTANTS.getAnswerPaperUploadUrl;
  private uploadExamOmrUrl = CONSTANTS.uploadExamOmrUrl;
  private getevaluatorassignmentUrl=CONSTANTS.getevaluatorassignmentUrl;
  miniopath = CONSTANTS.MINIO;

  minDate;
  maxDate;
  file: any = [];
  @ViewChild('fileInput') fileInput: ElementRef;
  uploadedFilesData = [];
  uploadedFilesData1 = [];
  checksubject: boolean;
  public formData1;
  resultList: any[] = [];
  fileNamePdf: any;
  filtersDetailsList = [];
  filtersData = [];
  examList: any[];
  scanPapersForm: FormGroup;
  summaryDetailsList = [];
  dateConvert: any;
  notUploadAnswerPaper: number;
  subjects: any[];
  filterSubjects: any[];
  examDate: any;
  subjectsData: any[];
  date = new Date()
  StudentAbsent: number;
  subjectDetails = '';
  flag: boolean = false;

  examListDetails = [];
  courses = [];
  academicYearsList = [];
  academicYears = [];
  examsList = [];
  examData = [];
  examsLists = [];
  examDateSessionList = [];
  examSessionSubjects = [];
  examDateList = [];
  examDates = [];
  regulationsList = [];
  regulations = [];

  constructor(private crudService: CrudService, private formbuilder: FormBuilder, private genericFunctions: GenericFunctions, private snotifyService: SnotifyService, private spinner: NgxSpinnerService, private router: Router) { }
  
  ngOnInit() {
    this.scanPapersForm = this.formbuilder.group({
      courseId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      examId: ['', Validators.required],
      examDate: [this.date, Validators.required],
      regulationId: ['', Validators.required],
      subjectId: ['', Validators.required]
    })
    this.getFiltersList();
  }

  getFiltersList(): void {
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (const list of this.filtersDetailsList) {
              if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                this.examListDetails = list;
                break;
              }
            }
            /*----------- COURSE -----------*/
            const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
              !courseList.includes(fk_course_id, index + 1));
            if (this.courses.length > 0) {
              this.courses.sort((a, b) => a.course_code.localeCompare(b.course_code));
              this.scanPapersForm.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.scanPapersForm.value.courseId);
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
    this.scanPapersForm.get('academicYearId').setValue('');
    this.scanPapersForm.get('examId').setValue('');
    this.scanPapersForm.get('examDate').setValue('');
    this.scanPapersForm.get('subjectId').setValue('');
    this.scanPapersForm.get('regulationId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.examDateSessionList = [];
    this.examSessionSubjects = [];
    this.examDateList = [];
    this.examDates = [];
    this.academicYearsList = [];
    this.academicYears = [];
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    /*----------- ACADEMIC YEAR -----------*/
    this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.scanPapersForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
    }
    if (this.academicYears.length > 0) {
      this.academicYears = this.academicYears.sort((a, b) => parseInt(b.academic_year) - parseInt(a.academic_year));
      this.scanPapersForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.scanPapersForm.value.academicYearId)
    }
  }
  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId) {
    this.scanPapersForm.get('examId').setValue('');
    this.scanPapersForm.get('examDate').setValue('');
    this.scanPapersForm.get('subjectId').setValue('');
    this.scanPapersForm.get('regulationId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.examDateSessionList = [];
    this.examSessionSubjects = [];
    this.examDateList = [];
    this.examDates = [];
    this.examsLists = [];
    this.examData = [];
    this.examsList = [];
    /*----------- EXAM LIST -----------*/
    this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.scanPapersForm.value.courseId && x.fk_academic_year_id === academicYearId))
    if (this.examsLists.length > 0) {
      const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
      this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
      this.examsList = this.examsList.filter(x => !x.is_internal_exam)
      this.examData = this.examsList;
    }
    if (this.examsList.length > 0) {
      this.scanPapersForm.get('examId').setValue(this.examsList[0].fk_exam_id);
      this.selectedExam(this.scanPapersForm.value.examId)
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
    this.scanPapersForm.get('examDate').setValue('');
    this.scanPapersForm.get('subjectId').setValue('');
    this.scanPapersForm.get('regulationId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.examDateSessionList = [];
    this.examSessionSubjects = [];
    this.examDateList = [];
    this.examDates = [];
    this.spinner.show();
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_intt' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_univ_examcenter_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.scanPapersForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.scanPapersForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.scanPapersForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: '' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    ];
    this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.examSessionSubjects = result.data.result;
            if (this.examSessionSubjects && this.examSessionSubjects.length > 0) {
              for (const list of this.examSessionSubjects) {
                if (list?.length > 0 && list[0].flag === 'univ_exam_sub_intt') {
                  this.examDateList = list;
                  break;  // Stop looping once we find the first match
                }
              }
              if (this.examDateList && this.examDateList.length > 0) {
                const ExamListData = this.examDateList.map(({ exam_date }) => exam_date);
                this.examDates = this.examDateList.filter(({ exam_date }, index) =>
                  !ExamListData.includes(exam_date, index + 1));
              }
              this.minDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].from_date);
              this.scanPapersForm.get('examDate').setValue(this.minDate);
              this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate); // new Date(this.data.issueTodate);
              this.maxDate = this.genericFunctions.momentWithDateFormatYMD(this.examsList.filter(x => (x.fk_exam_id === examId))[0].to_date);
              this.calDays();
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
  calDays() {
    this.scanPapersForm.get('subjectId').setValue('');
    this.scanPapersForm.get('regulationId').setValue('');
    this.regulationsList = [];
    this.regulations = [];
    this.subjectsData = [];
    this.subjects = [];
    this.filterSubjects = [];
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate);
    console.log(this.examDate);
    /*..............DISTINCT SUBJECT......... */
    this.regulationsList = this.examDateList.filter(x => (x.exam_date === this.examDate));
    if (this.regulationsList && this.regulationsList.length > 0) {
      const regulationsList = this.regulationsList.map(({ fk_regulation_id }) => fk_regulation_id);
      this.regulations = this.regulationsList.filter(({ fk_regulation_id }, index) => !regulationsList.includes(fk_regulation_id, index + 1));
    }
    if (this.regulations && this.regulations.length > 0) {
      this.scanPapersForm.get('regulationId').setValue(this.regulations[0].fk_regulation_id);
      this.selectedRegulation(this.scanPapersForm.value.regulationId);
    } 
  }
  selectedRegulation(regulationId){
    this.scanPapersForm.get('subjectId').setValue('');
    this.subjectsData = [];
    this.subjects = [];
    this.filterSubjects = [];
    this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.scanPapersForm.value.examDate);
    console.log(this.examDate);
    /*..............DISTINCT SUBJECT......... */
    this.subjectsData = this.examDateList.filter(x => (x.fk_regulation_id === this.scanPapersForm.value.regulationId && x.exam_date === this.examDate ));
    if (this.subjectsData && this.subjectsData.length > 0) {
      const subject_Data = this.subjectsData.map(({ fk_subject_id }) => fk_subject_id);
      this.subjects = this.subjectsData.filter(({ fk_subject_id }, index) =>
        !subject_Data.includes(fk_subject_id, index + 1));
      this.filterSubjects = this.subjectsData;
      this.scanPapersForm.get('subjectId').setValue(this.filterSubjects[0].fk_subject_id);
    } 
  }
  searchdata(value) {
    this.filterSubjects = []
    this.search(value);
  }
  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjects.length; i++) {
      let option = this.subjects[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.filterSubjects.push(option);
      }
      else if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
        this.filterSubjects.push(option);
      }
    }
  }
  getList() {
    this.dateConvert = this.genericFunctions.momentFormatYMD1(this.scanPapersForm.value.examDate);
    this.subjectDetails = ''
    this.subjectDetails = this.filterSubjects.filter(x => (x.fk_subject_id === this.scanPapersForm.value.subjectId))[0]?.subject_name + ' (' +
    this.filterSubjects.filter(x => (x.fk_subject_id === this.scanPapersForm.value.subjectId))[0]?.subject_code + ')';
    this.spinner.show();
    this.summaryDetailsList = [];
    let request = [
      { paramName: 'in_flag', paramValue: 'exam_timetable_answerpaper_details' },
      { paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId') },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: this.scanPapersForm.value.academicYearId },
      { paramName: 'in_isadmin', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.scanPapersForm.value.examId },
      { paramName: 'in_timetable_id', paramValue: 0 },
      { paramName: 'in_exam_date', paramValue: this.dateConvert },
      { paramName: 'in_subject_id', paramValue: this.scanPapersForm.value.subjectId },      
      { paramName: 'in_loginuser_empid', paramValue: 0 },
      { paramName: 'in_loginuser_roleid', paramValue: 0 }
    ];
    this.crudService.getDetailsByRequest(this.getAnswerPaperUploadUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.summaryDetailsList = result.data.result[0];
            this.notUploadAnswerPaper = this.summaryDetailsList[0]?.presented_Students - this.summaryDetailsList[0]?.no_oof_answerpaper_uploaded
            this.StudentAbsent = this.summaryDetailsList[0]?.attendance_marked - this.summaryDetailsList[0]?.presented_Students

            // this.dataSource1 = new MatTableDataSource(this.summaryDetailsList);
            // setTimeout(()=>this.dataSource1.paginator = this.paginator1);
            // this.dataSource1.sort = this.sort;
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
  uploadFiles(files) {
    this.flag = true;
    this.uploadedFilesData = []
    this.uploadedFiles = []

    if (this.fileInput.nativeElement.files.length > 0) {
      for (let i = 0; i < this.fileInput.nativeElement.files.length; i++) {
        // this.formData.append('file',
        //   this.fileInput.nativeElement.files[i],
        //   this.fileInput.nativeElement.files[i].name);
        const path: string = this.fileInput.nativeElement.files[i].webkitRelativePath;
        const pathPieces = path.split('/');
        const currentFolder = pathPieces[1];
        pathPieces.pop();
        this.uploadedFiles.push({
          fileName: currentFolder,
          folder: pathPieces[0],
          status: 'Pending',
          view: '',
          file: this.fileInput.nativeElement.files[i]
        });
      }
    }

  }
  goBack() {
    this.uploadedFiles = []
    this.flag = false;
    this.fileInput.nativeElement.value = '';
  }

  async submit() {
    let filesArray = [];
    for (let i = 0; i < this.fileInput.nativeElement.files.length; i++) {
      if (this.uploadedFiles.filter(x => (x.fileName === this.fileInput.nativeElement.files[i].name)).length > 0) {
        this.uploadedFiles.filter(x => (x.fileName === this.fileInput.nativeElement.files[i].name))[0].status = 'Progress';
      }
      this.formData1 = new FormData();
      this.formData1.append("file", this.fileInput.nativeElement.files[i], this.fileInput.nativeElement.files[i].name);
      filesArray.push(this.crudService.upload(this.uploadExamOmrUrl, this.formData1))
    }

    forkJoin(filesArray)
      .pipe(map(data => data.reduce((result: any, arr: any) => [...result, arr], [])))
      .subscribe((data: any) => {
        // this.snotifyService.success('Successfully uploaded files', 'Success!');
        data.forEach(element => {
          let fileName = element[0].split('/');
          if (fileName[5] != undefined) {
            if (this.uploadedFiles.filter(x => (x.fileName === fileName[5])).length > 0) {
              this.uploadedFiles.filter(x => (x.fileName === fileName[5]))[0].status = 'Success';
              this.uploadedFiles.filter(x => (x.fileName === fileName[5]))[0].view = element[0];
            }
          }
          else if (fileName[5] == undefined) {
            let fileName = element[0].split(' ');
            this.fileNamePdf = fileName[0] + '.pdf';
            if (this.uploadedFiles.filter(x => (x.fileName === this.fileNamePdf)).length > 0) {
              this.uploadedFiles.filter(x => (x.fileName === this.fileNamePdf))[0].status = 'File not found';
              this.uploadedFiles.filter(x => (x.fileName === this.fileNamePdf))[0].view = ''
            }
          }
        });
        this.snotifyService.success('Files uploaded', 'Success!');
        this.uploadedFilesData = []
        this.uploadedFiles = []
        this.AssignmentRun();
        this.flag = true;
        this.fileInput.nativeElement.value = '';
        this.getList();

      });

  }

  openFile(path): void {
    window.open(this.miniopath + path, '_blank', 'width=700,height=600');
  }
  checkedItems(check, index, item): void {
    if (check == true) {
      this.uploadedFilesData.push(item)
    }
    for (let i = 0; i < this.uploadedFilesData.length; i++) {
      if (check == false) {
        if (this.uploadedFilesData[i].fileName == item.fileName) {
          this.uploadedFilesData.splice(i, 1);
        }
      }
      else {
      }
    }
  }
  markItems(): void {
    this.uploadedFilesData = []
    for (let i = 0; i < this.uploadedFiles.length; i++) {
      if (this.checksubject) {
        this.uploadedFiles[i].checked = true;
        this.uploadedFilesData.push(this.uploadedFiles[i]);

      } else {
        this.uploadedFiles[i].checked = false;
        this.checksubject = false
        this.uploadedFilesData = []
      }
    }

  }
  AssignmentRun(){
    if ( this.scanPapersForm.valid){
    this.crudService.listByEightIds(this.getevaluatorassignmentUrl, 
      'popstudentassignment',
      '',
      '',
      '',
      '', 
     this.scanPapersForm.value.examId,
     0,  
      0 ,
      
      'in_flag', 'in_profileids' ,'in_exam_evaluationassignment_ids', 'in_omr_serial_nos', 'in_timetable_det_ids','in_exam_id','in_subject_id','in_course_year_id'
     )
  .subscribe(result => {
      if (result.statusCode === 200){
           if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.snotifyService.success(result.message, 'Success!');  
  
           } else {
               this.snotifyService.success(result.message, 'Error!');  
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
  else{
     this.snotifyService.info('Please Select The Filters', 'Info!');
  }
  }
  //   synchronousRequest(url) {
  //     const xhr = new XMLHttpRequest();
  //     xhr.open('GET', url, false);
  //     xhr.send(null);
  //     if (xhr.status === 200) {
  //        return xhr.responseText;
  //     } else {
  //        throw new Error('Request failed: ' + xhr.statusText);
  //     }
  //  }
}