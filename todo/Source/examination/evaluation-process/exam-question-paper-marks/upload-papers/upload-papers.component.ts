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

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,private dialogRef: MatDialogRef<UploadPapersComponent>,
    @Inject(MAT_DIALOG_DATA) private data ,private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
}

  ngOnInit(): void {
  }
  uploadQuestionPaper(files): void{
     /*-------- FILE UPLOAD ---------*/ 
  this.uploadedFiles=[]
  this.formData = new FormData();
  this.formData.append('questionPaperId',this.data.pk_exam_questionpaper_id);
  if (this.QuestionPaper.nativeElement.files.length > 0){
   for(let i=0;i<this.QuestionPaper.nativeElement.files.length;i++){
    this.formData.append('questionPaper',
    this.QuestionPaper.nativeElement.files[i],
    this.QuestionPaper.nativeElement.files[i].name);
   }
    }
  }
  uploadAnswerPaper(files): void{
    /*-------- FILE UPLOAD ---------*/ 
  this.uploadedFiles=[]
  this.formData = new FormData();
  this.formData.append('questionPaperId',this.data.pk_exam_questionpaper_id);
  if (this.modelAnswerPaper.nativeElement.files.length > 0){
   for(let i=0;i<this.modelAnswerPaper.nativeElement.files.length;i++){
    this.formData.append('modelAnswerPaper',
    this.modelAnswerPaper.nativeElement.files[i],
    this.modelAnswerPaper.nativeElement.files[i].name);
    
   }
    }
    if (this.QuestionPaper.nativeElement.files.length > 0){
      for(let i=0;i<this.QuestionPaper.nativeElement.files.length;i++){
       this.formData.append('questionPaper',
       this.QuestionPaper.nativeElement.files[i],
       this.QuestionPaper.nativeElement.files[i].name);
      }
       }
 }
   submit(){
  this.dialogRef.close(this.formData);
   
    // this.crudService.upload(this.PaperPathUploadUrl,this.formData)
    // .subscribe(result1 => {
    //   if (result1){
         
    //            this.snotifyService.success(result1.message, 'Success!');
    //   }else {
    //       this.snotifyService.error(result1.message, 'Error!');
    //   }
    // }, error => {
    //   if (error.error.statusCode === 401){
    //       this.snotifyService.error(error.error.message, 'Error!');
         
    //   }else{
    //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //   }
    // });
  }

}
