import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-security-code',
  templateUrl: './security-code.component.html',
  styleUrls: ['./security-code.component.scss']
})
export class SecurityCodeComponent implements OnInit {
  evaluatorForm:FormGroup
  constructor(private route: ActivatedRoute, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<SecurityCodeComponent>,
               @Inject(MAT_DIALOG_DATA) public details, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService)
                {

  }
  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      Passcode: ['', Validators.required],
      // examTime: ['', Validators.required],

    })
  }
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}

submit(){
  if(this.evaluatorForm.valid){
    // const obj={
    //   code:this.evaluatorForm.value.Passcode
    // }
    this.dialogRef.close(this.evaluatorForm.value.Passcode);
  }
}

}
