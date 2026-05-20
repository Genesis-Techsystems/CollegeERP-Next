import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
@Component({
  selector: 'app-upload-papers',
  templateUrl: './upload-papers.component.html',
  styleUrls: ['./upload-papers.component.scss']
})
export class UploadPapersComponent implements OnInit {
  @ViewChild('QuestionPaper') QuestionPaper: ElementRef;
  @ViewChild('modelAnswerPaper') modelAnswerPaper: ElementRef;

  private PaperPathUploadUrl = CONSTANTS.PaperPathUploadUrl
  formData: FormData;
  uploadedFiles: any[];
  fileInput: any;
  file: any [];
  private uploadExamRegFormsUrl=CONSTANTS.uploadExamRegFormsUrl;
  @ViewChild('empPhoto') studentAvatar: ElementRef;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,private dialogRef: MatDialogRef<UploadPapersComponent>,
    @Inject(MAT_DIALOG_DATA) private data ,private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
}

  ngOnInit(): void {
  }
  upload(event: any): void {
    this.formData = new FormData();
    for (let i = 0; i < this.studentAvatar.nativeElement.files.length; i++) {
      this.formData.append('file',
      this.studentAvatar.nativeElement.files[i],
      this.studentAvatar.nativeElement.files[i].name);
         // Convert file to base64
       }
      this.formData.append('collegeCode',this.data.collegeCode)
      this.formData.append('examId',this.data.examId)
       this.formData.append('collegeId',this.data.collegeId)
       this.formData.append('courseId',this.data.courseId)

     
     }
  submit(): void{
    this.crudService.upload(this.uploadExamRegFormsUrl, this.formData)
    .subscribe(result1 => {
        this.spinner.hide();
        if (result1.statusCode === 200){
            if (result1.success) {
             this.snotifyService.success(result1.message, 'Success');
             
             }
        }else {
            this.snotifyService.error(result1.message, 'Error!');
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
    this.dialogRef.close();
  }

}
