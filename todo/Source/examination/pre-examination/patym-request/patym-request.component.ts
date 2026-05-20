import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CONSTANTS } from 'app/main/common/constants';
import { Router } from '@angular/router';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-patym-request',
  templateUrl: './patym-request.component.html',
  styleUrls: ['./patym-request.component.scss']
})
export class PatymRequestComponent implements OnInit {

  firstFormGroup: FormGroup;
  public formData;
  flag = false;
  patym: any = {};

  private pgPaytmRequesttUrl = CONSTANTS.pgPaytmRequesttUrl;
  private pgRedirectUrl = CONSTANTS.pgRedirectUrl;
  private MainUrl = CONSTANTS.MAINAPI;

  constructor(private formBuilder: FormBuilder, private router: Router, 
              private crudService: CrudService, private spinner: NgxSpinnerService, private snotifyService: SnotifyService) { }

  ngOnInit(): void {
    this.firstFormGroup = this.formBuilder.group({
      ORDER_ID: [],
      CUST_ID: [],
      INDUSTRY_TYPE_ID: [],
      CHANNEL_ID: [],
      TXN_AMOUNT: [],
    });
  }

  pay(item): void{
     console.log(item);
     this.spinner.show();
     this.formData = new FormData();
     this.formData.append('ORDER_ID', item.ORDER_ID);
     this.formData.append('CUST_ID', item.CUST_ID);
     this.formData.append('INDUSTRY_TYPE_ID', item.INDUSTRY_TYPE_ID);
     this.formData.append('CHANNEL_ID', item.CHANNEL_ID);
     this.formData.append('TXN_AMOUNT', item.TXN_AMOUNT);
     this.crudService.upload(this.pgPaytmRequesttUrl, this.formData)
     .subscribe(result => {
         this.spinner.hide();
         if (result.statusCode === 200){
             if (result.success) {
                 this.snotifyService.success(result.message, 'Success!');
                 item.CHECKSUMHASH = result.data.hash;
                 item.EMAIL = result.data.email;
                 item.MOBILE_NO = result.data.phone;
                 item.MID = 'uQseCO78947802247219';
                 item.WEBSITE = 'WEBSTAGING';
               //  item.ORDER_ID = 'ORDER123';
                 item.CALLBACK_URL = 'http://139.59.0.96:8080/dist/#/examination-management/pre-examination/patym-success';
                 this.patym = item;
                 this.flag = true;
                 console.log(item);
                 localStorage.setItem('checksum', item.CHECKSUMHASH);
                //  this.router.navigate(['/examination-management/pre-examination/patym-redirect'], { queryParams: { CHECKSUMHASH: item.CHECKSUMHASH,
                //  } });
                 this.createPaytmForm(item);
             }  
         }else {
             this.snotifyService.error(result.message, 'Error!');
         }
     }, error => {
         this.spinner.hide();
         if (error.error.statusCode === 401){
           this.snotifyService.error(error.error.message, 'Error!');
           // this.genericFunctions.logOut(this.router.url);
       }else{
           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
       }
     });
  }

  createPaytmForm(item): void {
    // tslint:disable-next-line: variable-name
    const my_form: any = document.createElement('form');
    my_form.name = 'paytm_form';
    my_form.method = 'post';
    my_form.action = 'https://securegw-stage.paytm.in/order/process';
 
    const myParams = Object.keys(item);
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < myParams.length; i++) {
       const key = myParams[i];
       // tslint:disable-next-line: variable-name
       const my_tb: any = document.createElement('input');
       my_tb.type = 'hidden';
       my_tb.name = key;
       my_tb.value = item[key];
       my_form.appendChild(my_tb);
     }
     
    document.body.appendChild(my_form);
    my_form.submit();
 // after click will fire you will redirect to paytm payment page.
 // after complete or fail transaction you will redirect to your CALLBACK URL
 }
}
